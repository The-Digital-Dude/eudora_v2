import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class StripeWebhookService {
  private readonly stripe: any;
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') ?? '',
      { apiVersion: '2026-05-27.dahlia' },
    );
  }

  constructEvent(payload: Buffer, signature: string): any {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  async handleEvent(event: any): Promise<void> {
    this.logger.log(`Processing Stripe event: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(event.data.object);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  private async handleSubscriptionUpdated(stripeSub: any) {
    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!local) {
      this.logger.warn(`Subscription not found locally: ${stripeSub.id}`);
      return;
    }

    const statusMap: Record<string, SubscriptionStatus> = {
      trialing: SubscriptionStatus.TRIALING,
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.UNPAID,
    };

    await this.prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: statusMap[stripeSub.status] ?? SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
    });

    this.logger.log(`Subscription ${local.id} updated to ${stripeSub.status}`);
  }

  private async handleSubscriptionDeleted(stripeSub: any) {
    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!local) return;

    await this.prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    this.logger.log(`Subscription ${local.id} marked as CANCELED`);
  }

  private async handleInvoicePaymentSucceeded(stripeInvoice: any) {
    const subscriptionId = typeof stripeInvoice.subscription === 'string'
      ? stripeInvoice.subscription
      : stripeInvoice.subscription?.id;

    if (!subscriptionId) return;

    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!local) return;

    const invoice = await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: stripeInvoice.id },
      create: {
        subscriptionId: local.id,
        stripeInvoiceId: stripeInvoice.id,
        amount: stripeInvoice.amount_paid / 100,
        currency: stripeInvoice.currency.toUpperCase(),
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
      update: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
    });

    const paymentIntentId =
      typeof stripeInvoice.payment_intent === 'string'
        ? stripeInvoice.payment_intent
        : stripeInvoice.payment_intent?.id;

    if (paymentIntentId) {
      await this.prisma.payment.upsert({
        where: { stripePaymentIntentId: paymentIntentId },
        create: {
          invoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId,
          amount: stripeInvoice.amount_paid / 100,
          currency: stripeInvoice.currency.toUpperCase(),
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: 'card',
        },
        update: { status: PaymentStatus.SUCCEEDED },
      });
    }

    this.logger.log(
      `Invoice ${invoice.id} marked PAID — $${stripeInvoice.amount_paid / 100}`,
    );
  }

  private async handleInvoicePaymentFailed(stripeInvoice: any) {
    const subscriptionId = typeof stripeInvoice.subscription === 'string'
      ? stripeInvoice.subscription
      : stripeInvoice.subscription?.id;

    if (!subscriptionId) return;

    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!local) return;

    const amountDue = stripeInvoice.amount_due ? stripeInvoice.amount_due / 100 : 0;

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: stripeInvoice.id },
      create: {
        subscriptionId: local.id,
        stripeInvoiceId: stripeInvoice.id,
        amount: amountDue,
        currency: stripeInvoice.currency.toUpperCase(),
        status: InvoiceStatus.OPEN,
      },
      update: { status: InvoiceStatus.OPEN },
    });

    // Update subscription to PAST_DUE
    await this.prisma.subscription.update({
      where: { id: local.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    this.logger.warn(
      `Payment failed for subscription ${local.id}. Marked as PAST_DUE.`,
    );
  }

  private async handleTrialWillEnd(stripeSub: any) {
    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
      include: { campus: true },
    });
    if (!local) return;

    // Log for now — hook up email notifications here
    this.logger.log(
      `Trial ending soon for campus "${local.campus.name}" (subscription ${local.id})`,
    );
  }
}
