import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { StripeService } from '../stripe/stripe.service';
import { WebhookService } from './webhook.service';

/**
 * Stripe calls this server-to-server, so it is `@Public` — authentication is
 * the signature check, not a session.
 *
 * The path is deliberately `/api/billing/webhooks/stripe`: `main.ts` already
 * enables `rawBody`, and the response-envelope filter already exempts this
 * exact path. Both are required for signature verification to work, since it
 * runs over the raw bytes rather than a re-serialised body.
 */
@Controller('billing/webhooks')
export class WebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly webhooks: WebhookService,
  ) {}

  @Public()
  @Post('stripe')
  async handleStripe(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!req.rawBody) {
      throw new BadRequestException('Raw body unavailable');
    }

    let event;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      // A bad signature is a 400, never a 500: Stripe retries on 5xx, and
      // retrying a forged or malformed payload achieves nothing.
      throw new BadRequestException(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
    }

    return this.webhooks.handleEvent(event);
  }
}
