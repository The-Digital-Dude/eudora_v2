import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { StripeService } from './stripe/stripe.service';
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutController } from './checkout/checkout.controller';
import { WebhookService } from './webhooks/webhook.service';
import { WebhookController } from './webhooks/webhook.controller';

/**
 * Billing is self-contained on purpose: it writes Entitlement rows directly
 * from the webhook rather than calling into EntitlementsService, because a
 * grant has to happen inside the same transaction that marks the order paid.
 * EntitlementsModule is imported for the read-side access checks only.
 */
@Module({
  imports: [PrismaModule, EntitlementsModule],
  controllers: [CheckoutController, WebhookController],
  providers: [StripeService, CheckoutService, WebhookService],
  exports: [StripeService],
})
export class BillingModule {}
