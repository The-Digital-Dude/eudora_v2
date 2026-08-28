import { Injectable, Logger } from '@nestjs/common';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Transactional email over Resend's HTTP API.
 *
 * Sent with `fetch` rather than an SDK, matching `ExpoPushService` — the
 * provider is one POST and a bearer token, so a dependency would buy nothing.
 * Swapping provider means changing the endpoint and body shape in this file
 * and nothing else.
 *
 * Degrades instead of throwing when unconfigured, the same contract
 * `StripeService` uses: the repo ships without mail credentials, and a missing
 * key must not stop the API booting or break flows that merely *notify*. In
 * that state the message is logged and `sendMail` reports failure honestly, so
 * a caller that genuinely depends on delivery — password reset — can tell.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly from: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM ?? 'Eudora <onboarding@resend.dev>';

    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — email is disabled and messages will be ' +
          'logged instead of sent. Password reset cannot work until this is ' +
          'configured. Set RESEND_API_KEY and EMAIL_FROM to enable it.',
      );
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Returns whether the message was actually accepted for delivery — never
   * `true` on a send that did not happen. The previous mock returned `true`
   * unconditionally, which is what let the product believe mail was working.
   */
  async sendMail(to: string, subject: string, body: string): Promise<boolean> {
    if (!this.apiKey) {
      // Subject and recipient only. The body is deliberately NOT logged: a
      // password-reset message contains a live account-takeover link, and
      // printing it here would put a working credential in the server log
      // (and anywhere logs are shipped) for every unconfigured environment.
      this.logger.log(
        `[email not configured] would send to ${to} — subject: ${subject}`,
      );
      return false;
    }

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject,
          // Callers pass plain text; sent as both so it renders in every
          // client without a templating layer this product does not need yet.
          text: body,
          html: `<pre style="font:inherit;white-space:pre-wrap">${escapeHtml(body)}</pre>`,
        }),
      });

      if (!res.ok) {
        // Body may carry the provider's reason (unverified domain, bad key).
        const detail = await res.text().catch(() => '');
        this.logger.error(
          `Resend rejected the message for ${to}: ${res.status} ${detail.slice(0, 300)}`,
        );
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err as Error);
      return false;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
