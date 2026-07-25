import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { StripeClient } from './stripe.types';

/**
 * Single shared Stripe client for the whole billing module.
 *
 * Previously each service constructed its own client typed as `any`, which
 * silently disabled type checking against the SDK. This exposes a properly
 * typed `Stripe` instance so schema drift surfaces at build time.
 */
@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  readonly client: StripeClient;

  /** Whether a usable secret key was supplied. */
  readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';

    // A placeholder like "sk_test" (no body) is treated as unconfigured — a
    // real key is `sk_test_`/`sk_live_` followed by the key material.
    this.isConfigured = /^sk_(test|live)_.+/.test(secretKey);

    // Stripe v22 throws during construction when given an empty key. Keep an
    // inert client available for injected billing dependencies while the
    // explicit isConfigured guards disable every paid operation. The dummy
    // key is never used for a request in this mode.
    this.client = new Stripe(this.isConfigured ? secretKey : 'sk_test_disabled', {
      apiVersion: '2026-05-27.dahlia',
      appInfo: { name: 'eudora-api-service' },
    });
  }

  onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is missing or malformed. Paid plans are disabled; ' +
          'free plans still work. Set a real sk_test_/sk_live_ key to enable payments.',
      );
    }
    if (!this.webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET is missing or malformed. Incoming webhooks ' +
          'will be rejected until it is set.',
      );
    }

    // A well-formed key can still be a dummy value, which the format check
    // above cannot detect. Verify it against Stripe so a bad key surfaces at
    // boot rather than at the first customer's checkout. Fire-and-forget: this
    // must never block or fail startup.
    if (this.isConfigured) {
      void this.verifyCredentials();
    }
  }

  private async verifyCredentials(): Promise<void> {
    try {
      // Cheapest authenticated call that proves the key is accepted.
      const balance = await this.client.balance.retrieve();
      this.logger.log(
        `Stripe credentials OK (livemode=${balance.livemode})`,
      );
    } catch (err) {
      this.logger.error(
        `Stripe rejected STRIPE_SECRET_KEY: ${(err as Error).message}. ` +
          'Paid plans will fail until a valid key is configured.',
      );
    }
  }

  /** Configured webhook signing secret, or empty string if unset/placeholder. */
  get webhookSecret(): string {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    return /^whsec_.+/.test(secret) ? secret : '';
  }

  /** Base URL of the frontend, used to build Checkout return URLs. */
  get appUrl(): string {
    return (
      this.config.get<string>('APP_URL')?.replace(/\/$/, '') ??
      'http://localhost:3000'
    );
  }
}
