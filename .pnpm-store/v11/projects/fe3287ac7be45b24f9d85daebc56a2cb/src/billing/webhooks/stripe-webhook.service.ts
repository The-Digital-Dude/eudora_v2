import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import type {
  StripeClient,
  StripeEvent,
  StripeSubscription,
  StripeInvoice,
  StripeCheckoutSession,
} from '../stripe/stripe.types';
import {
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
  PlanInterval,
  Prisma,
} from '@prisma/client';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  private get stripe(): StripeClient {
    return this.stripeService.client;
  }

  constructEvent(payload: Buffer, signature: string): StripeEvent {
    const secret = this.stripeService.webhookSecret;
    if (!secret) {
      throw new BadRequestException(
        'STRIPE_WEBHOOK_SECRET is not configured; refusing to process webhook',
      );
    }
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Stripe delivers at-least-once and retries on non-2xx, so the same event id
   * can arrive several times. We claim the id first; a unique-constraint
   * violation means another delivery already handled it.
   */
  private async claimEvent(event: StripeEvent): Promise<boolean> {
    try {
      await this.prisma.stripeEvent.create({
        data: { id: event.id, type: event.type },
      });
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return false;
      }
      throw err;
    }
  }

  async handleEvent(event: StripeEvent): Promise<void> {
    const claimed = await this.claimEvent(event);
    if (!claimed) {
      this.logger.log(`Skipping already-processed event ${event.id}`);
      return;
    }

    this.logger.log(`Processing Stripe event: ${event.type} [${event.id}]`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

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
    } catch (err) {
      // Release the claim so Stripe's retry can reprocess this event, rather
      // than the failure being permanently swallowed by the dedup record.
      await this.prisma.stripeEvent
        .delete({ where: { id: event.id } })
        .catch(() => undefined);
      throw err;
    }
  }

  // ─── Field extraction helpers ────────────────────────────────────────────────

  /**
   * As of API 2025-03+ the subscription reference moved off the top level of
   * Invoice into `parent.subscription_details.subscription`. Reading
   * `invoice.subscription` returns undefined and silently drops the event.
   */
  private subscriptionIdFromInvoice(invoice: StripeInvoice): string | null {
    const details = invoice.parent?.subscription_details;
    if (!details?.subscription) return null;
    return typeof details.subscription === 'string'
      ? details.subscription
      : details.subscription.id;
  }

  /** The PaymentIntent now hangs off the invoice's `payments` list. */
  private paymentIntentIdFromInvoice(invoice: StripeInvoice): string | null {
    const intent = invoice.payments?.data?.[0]?.payment?.payment_intent;
    if (!intent) return null;
    return typeof intent === 'string' ? intent : intent.id;
  }

  /** Billing period lives on the subscription item, not the subscription. */
  private periodFromSubscription(sub: StripeSubscription): {
    start: Date;
    end: Date;
  } | null {
    const item = sub.items?.data?.[0];
    if (!item) return null;
    return {
      start: new Date(item.current_period_start * 1000),
      end: new Date(item.current_period_end * 1000),
    };
  }

  private mapStatus(status: StripeSubscription["status"]): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      trialing: SubscriptionStatus.TRIALING,
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.UNPAID,
      incomplete: SubscriptionStatus.UNPAID,
      incomplete_expired: SubscriptionStatus.CANCELED,
      paused: SubscriptionStatus.PAST_DUE,
    };
    return statusMap[status] ?? SubscriptionStatus.ACTIVE;
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  /**
   * Checkout finished and payment succeeded — this is where a paid subscription
   * first becomes real locally. Until this fires, no Subscription row exists.
   */
  private async handleCheckoutCompleted(session: StripeCheckoutSession) {
    if (session.mode !== 'subscription') return;
    if (session.payment_status === 'unpaid') {
      this.logger.warn(`Checkout ${session.id} completed but is still unpaid`);
      return;
    }

    const campusId = session.metadata?.campusId;
    const planId = session.metadata?.planId;
    const interval =
      session.metadata?.interval === PlanInterval.ANNUAL
        ? PlanInterval.ANNUAL
        : PlanInterval.MONTHLY;

    if (!campusId || !planId) {
      this.logger.error(
        `Checkout ${session.id} is missing campusId/planId metadata; cannot link subscription`,
      );
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (!subscriptionId) {
      this.logger.error(`Checkout ${session.id} has no subscription attached`);
      return;
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    const stripeSub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const period = this.periodFromSubscription(stripeSub);
    if (!period) {
      this.logger.error(
        `Stripe subscription ${subscriptionId} has no items; cannot set billing period`,
      );
      return;
    }

    // upsert on campusId keeps this idempotent even if the row was created by a
    // subscription.updated event that raced ahead of this one.
    await this.prisma.subscription.upsert({
      where: { campusId },
      create: {
        campusId,
        planId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: this.mapStatus(stripeSub.status),
        interval,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        trialEndsAt: stripeSub.trial_end
          ? new Date(stripeSub.trial_end * 1000)
          : null,
      },
      update: {
        planId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: this.mapStatus(stripeSub.status),
        interval,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        canceledAt: null,
      },
    });

    this.logger.log(
      `Subscription activated for campus ${campusId} via checkout ${session.id}`,
    );
  }

  private async handleSubscriptionUpdated(stripeSub: StripeSubscription) {
    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!local) {
      // Ordinary during checkout — the row is created by checkout.session.completed.
      this.logger.warn(`Subscription not found locally: ${stripeSub.id}`);
      return;
    }

    const period = this.periodFromSubscription(stripeSub);

    await this.prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: this.mapStatus(stripeSub.status),
        ...(period
          ? { currentPeriodStart: period.start, currentPeriodEnd: period.end }
          : {}),
        canceledAt: stripeSub.cancel_at_period_end ? new Date() : null,
      },
    });

    this.logger.log(`Subscription ${local.id} updated to ${stripeSub.status}`);
  }

  private async handleSubscriptionDeleted(stripeSub: StripeSubscription) {
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

  private async handleInvoicePaymentSucceeded(stripeInvoice: StripeInvoice) {
    const subscriptionId = this.subscriptionIdFromInvoice(stripeInvoice);
    if (!subscriptionId) return;

    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!local) {
      this.logger.warn(
        `Invoice ${stripeInvoice.id} references unknown subscription ${subscriptionId}`,
      );
      return;
    }

    const amount = (stripeInvoice.amount_paid ?? 0) / 100;
    const currency = (stripeInvoice.currency ?? 'usd').toUpperCase();

    const invoice = await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: stripeInvoice.id },
      create: {
        subscriptionId: local.id,
        stripeInvoiceId: stripeInvoice.id,
        amount,
        currency,
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
      update: {
        amount,
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
    });

    const paymentIntentId = this.paymentIntentIdFromInvoice(stripeInvoice);
    if (paymentIntentId) {
      await this.prisma.payment.upsert({
        where: { stripePaymentIntentId: paymentIntentId },
        create: {
          invoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId,
          amount,
          currency,
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: 'card',
        },
        update: { status: PaymentStatus.SUCCEEDED },
      });
    }

    // A successful payment clears a prior PAST_DUE/UNPAID state.
    if (
      local.status === SubscriptionStatus.PAST_DUE ||
      local.status === SubscriptionStatus.UNPAID
    ) {
      await this.prisma.subscription.update({
        where: { id: local.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    }

    this.logger.log(`Invoice ${invoice.id} marked PAID — ${amount} ${currency}`);
  }

  private async handleInvoicePaymentFailed(stripeInvoice: StripeInvoice) {
    const subscriptionId = this.subscriptionIdFromInvoice(stripeInvoice);
    if (!subscriptionId) return;

    const local = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!local) return;

    const amountDue = (stripeInvoice.amount_due ?? 0) / 100;
    const currency = (stripeInvoice.currency ?? 'usd').toUpperCase();

    const invoice = await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: stripeInvoice.id },
      create: {
        subscriptionId: local.id,
        stripeInvoiceId: stripeInvoice.id,
        amount: amountDue,
        currency,
        status: InvoiceStatus.OPEN,
      },
      update: { status: InvoiceStatus.OPEN },
    });

    const paymentIntentId = this.paymentIntentIdFromInvoice(stripeInvoice);
    if (paymentIntentId) {
      await this.prisma.payment.upsert({
        where: { stripePaymentIntentId: paymentIntentId },
        create: {
          invoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId,
          amount: amountDue,
          currency,
          status: PaymentStatus.FAILED,
          paymentMethod: 'card',
        },
        update: { status: PaymentStatus.FAILED },
      });
    }

    await this.prisma.subscription.update({
      where: { id: local.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    this.logger.warn(
      `Payment failed for subscription ${local.id}. Marked as PAST_DUE.`,
    );
  }

  private async handleTrialWillEnd(stripeSub: StripeSubscription) {
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
