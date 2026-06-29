import { Module } from '@nestjs/common';
import { PlanModule } from './plans/plan.module';
import { SubscriptionModule } from './subscriptions/subscription.module';
import { CheckoutModule } from './checkout/checkout.module';
import { StripeWebhookModule } from './webhooks/stripe-webhook.module';

@Module({
  imports: [
    PlanModule,
    SubscriptionModule,
    CheckoutModule,
    StripeWebhookModule,
  ],
})
export class BillingModule {}
