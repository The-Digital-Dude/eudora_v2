import { Module } from '@nestjs/common';
import { PlanModule } from './plans/plan.module';
import { SubscriptionModule } from './subscriptions/subscription.module';
import { StripeWebhookModule } from './webhooks/stripe-webhook.module';

@Module({
  imports: [PlanModule, SubscriptionModule, StripeWebhookModule],
})
export class BillingModule {}
