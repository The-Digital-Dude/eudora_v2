import { Injectable, Logger } from '@nestjs/common';
import { EntitlementStatus, PlanStatus } from '@prisma/client';
import type {
  StripeCharge,
  StripeCheckoutSession,
  StripeDispute,
  StripeEvent,
  StripeInvoice,
  StripeSubscription,
} from '../stripe/stripe-types';
import { PrismaService } from '../../prisma/prisma.service';
import { installmentTerms } from '../pricing/pricing';
import { StripeService } from '../stripe/stripe.service';

/**
 * Turns Stripe events into orders, entitlements and instalment progress.
 *
 * Every handler runs behind a `StripeWebhookEvent` idempotency check. Stripe
 * retries deliveries on any non-2xx and can deliver the same event more than
 * once even on success, so granting an entitlement twice — or advancing a
 * payment plan twice — is the failure mode that actually costs money here.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async handleEvent(event: StripeEvent): Promise<{ handled: boolean }> {
    // Claim the event first. The unique constraint on stripeEventId is what
    // makes concurrent redeliveries safe, not this read.
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: { stripeEventId: event.id, type: event.type },
      });
    } catch {
      this.logger.log(`Duplicate Stripe event ignored: ${event.id}`);
      return { handled: false };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(
          event.data.object as StripeCheckoutSession,
        );
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object as StripeInvoice);
        break;
      case 'invoice.payment_failed':
        await this.onInvoiceFailed(event.data.object as StripeInvoice);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(
          event.data.object as StripeSubscription,
        );
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object as StripeCharge);
        break;
      case 'charge.dispute.created':
        await this.onDisputeCreated(event.data.object as StripeDispute);
        break;
      case 'charge.dispute.closed':
        await this.onDisputeClosed(event.data.object as StripeDispute);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
        return { handled: false };
    }

    return { handled: true };
  }

  /** Payment (or first instalment) succeeded — grant access. */
  private async onCheckoutCompleted(session: StripeCheckoutSession) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.warn('checkout.session.completed without orderId metadata');
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      this.logger.warn(
        `checkout.session.completed for unknown order ${orderId}`,
      );
      return;
    }

    const item = order.items[0];
    if (!item) return;

    const isInstallment = item.billingMode === 'INSTALLMENT';
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : null,
          stripeCustomerId:
            typeof session.customer === 'string' ? session.customer : null,
        },
      });

      // A one-time purchase of self-paced content is permanent immediately.
      // An instalment plan is only paid up to the first period, so access
      // tracks paidThroughDate until the schedule completes.
      const paidThroughDate = isInstallment
        ? new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)
        : null;

      // Live access ends with its cohort; self-paced never expires (decision 6).
      // Reading the batch here rather than trusting the order keeps the expiry
      // correct even if the batch was rescheduled after purchase.
      let accessExpiresAt: Date | null = null;
      if (item.batchId) {
        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
          select: { endDate: true },
        });
        accessExpiresAt = batch?.endDate ?? null;
      }

      await tx.entitlement.upsert({
        where: { orderItemId: item.id },
        create: {
          studentProfileId: item.studentProfileId,
          programId: item.programId,
          courseId: item.courseId,
          batchId: item.batchId,
          orderItemId: item.id,
          source: 'PURCHASE',
          status: EntitlementStatus.ACTIVE,
          accessStartsAt: now,
          accessExpiresAt,
          paidThroughDate,
        },
        update: {
          status: EntitlementStatus.ACTIVE,
          accessExpiresAt,
          paidThroughDate,
        },
      });

      // A live purchase is a seat in a cohort, so it also becomes a real
      // enrolment — that is what makes gradebook, attendance and homework
      // start working for this student without any further step.
      if (item.batchId) {
        await tx.studentCourseEnrollment.upsert({
          where: {
            studentProfileId_batchId: {
              studentProfileId: item.studentProfileId,
              batchId: item.batchId,
            },
          },
          create: {
            studentProfileId: item.studentProfileId,
            batchId: item.batchId,
            status: 'ENROLLED',
          },
          update: { status: 'ENROLLED' },
        });
      }

      if (isInstallment && item.installmentCount) {
        const terms = installmentTerms(item.priceCents, item.installmentCount);
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : null;

        if (subscriptionId) {
          await tx.installmentPlan.upsert({
            where: { orderItemId: item.id },
            create: {
              orderItemId: item.id,
              stripeSubscriptionId: subscriptionId,
              installmentCount: terms.installmentCount,
              installmentsPaid: 1,
              amountPerInstallmentCents: terms.amountPerInstallmentCents,
              finalInstallmentCents: terms.finalInstallmentCents,
              status: PlanStatus.ACTIVE,
              paidThroughDate: paidThroughDate!,
            },
            update: {},
          });
        }
      }
    });

    this.logger.log(`Order ${order.id} paid; entitlement granted`);
  }

  /** A later instalment cleared — advance the plan. */
  private async onInvoicePaid(invoice: StripeInvoice) {
    const subscriptionId = this.subscriptionIdOf(invoice);
    if (!subscriptionId) return;

    const plan = await this.prisma.installmentPlan.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { orderItem: true },
    });
    if (!plan) return;

    // The checkout event already counted the first instalment, so ignore the
    // invoice that accompanies it rather than double-counting.
    if (plan.installmentsPaid === 0) return;

    const installmentsPaid = Math.min(
      plan.installmentsPaid + 1,
      plan.installmentCount,
    );
    const complete = installmentsPaid >= plan.installmentCount;
    const paidThroughDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.installmentPlan.update({
        where: { id: plan.id },
        data: {
          installmentsPaid,
          status: complete ? PlanStatus.COMPLETED : PlanStatus.ACTIVE,
          paidThroughDate,
        },
      });

      await tx.entitlement.updateMany({
        where: { orderItemId: plan.orderItemId },
        data: {
          status: EntitlementStatus.ACTIVE,
          // Fully paid: access stops being time-limited and becomes permanent
          // for self-paced content (decision 6A).
          paidThroughDate: complete ? null : paidThroughDate,
        },
      });
    });
  }

  /** A card failed — withhold access but keep the row so a retry restores it. */
  private async onInvoiceFailed(invoice: StripeInvoice) {
    const subscriptionId = this.subscriptionIdOf(invoice);
    if (!subscriptionId) return;

    const plan = await this.prisma.installmentPlan.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!plan) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.installmentPlan.update({
        where: { id: plan.id },
        data: { status: PlanStatus.PAST_DUE },
      });
      await tx.entitlement.updateMany({
        where: { orderItemId: plan.orderItemId },
        data: { status: EntitlementStatus.PAST_DUE },
      });
    });
  }

  /**
   * The subscription ended. If the schedule completed this is the expected
   * `cancel_at` firing and access stays; if it ended early the plan was
   * abandoned and access expires.
   */
  private async onSubscriptionDeleted(subscription: StripeSubscription) {
    const plan = await this.prisma.installmentPlan.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!plan) return;

    const complete = plan.installmentsPaid >= plan.installmentCount;

    await this.prisma.$transaction(async (tx) => {
      await tx.installmentPlan.update({
        where: { id: plan.id },
        data: {
          status: complete ? PlanStatus.COMPLETED : PlanStatus.CANCELLED,
        },
      });
      await tx.entitlement.updateMany({
        where: { orderItemId: plan.orderItemId },
        data: complete
          ? { status: EntitlementStatus.ACTIVE, paidThroughDate: null }
          : { status: EntitlementStatus.EXPIRED },
      });
    });
  }

  /**
   * A refund, full or partial. Any amount revokes access — a partial refund
   * is usually a goodwill gesture where the buyer keeps the course, but this
   * product's call is to err toward not leaving paid-for-then-refunded
   * content unlocked. `POST /entitlements/grant` re-grants it by hand if a
   * partial refund shouldn't have cost the buyer their access.
   */
  private async onChargeRefunded(charge: StripeCharge) {
    const invoiceId = this.fieldId(charge, 'invoice');
    const paymentIntentId = this.fieldId(charge, 'payment_intent');

    const orderItemId = await this.resolveOrderItemId({
      invoiceId,
      paymentIntentId,
    });
    if (!orderItemId) {
      this.logger.warn(`charge.refunded for unresolvable charge ${charge.id}`);
      return;
    }

    const note = charge.refunded
      ? `Stripe: fully refunded (${this.formatAmount(charge.amount_refunded, charge.currency)}, charge ${charge.id})`
      : `Stripe: partially refunded (${this.formatAmount(charge.amount_refunded, charge.currency)} of ${this.formatAmount(charge.amount, charge.currency)}, charge ${charge.id})`;

    await this.revokeForOrderItem(orderItemId, note);
    this.logger.log(
      `Entitlement for order item ${orderItemId} revoked: ${note}`,
    );
  }

  /**
   * A dispute means the card network has already clawed the funds back,
   * regardless of how it resolves — so access is revoked immediately, not
   * held pending the outcome.
   */
  private async onDisputeCreated(dispute: StripeDispute) {
    const orderItemId = await this.resolveOrderItemIdForDispute(dispute);
    if (!orderItemId) {
      this.logger.warn(
        `charge.dispute.created for unresolvable dispute ${dispute.id}`,
      );
      return;
    }

    const note = `Stripe: dispute opened (${this.formatAmount(dispute.amount, dispute.currency)}, dispute ${dispute.id}) — access revoked pending resolution`;
    await this.revokeForOrderItem(orderItemId, note);
    this.logger.log(
      `Entitlement for order item ${orderItemId} revoked for dispute ${dispute.id}`,
    );
  }

  /**
   * Only a dispute won in your favour restores access, and only the
   * entitlement — a cancelled instalment plan is not automatically resumed,
   * since restarting one is a billing decision, not a status flip.
   */
  private async onDisputeClosed(dispute: StripeDispute) {
    if (dispute.status !== 'won') return;

    const orderItemId = await this.resolveOrderItemIdForDispute(dispute);
    if (!orderItemId) {
      this.logger.warn(
        `charge.dispute.closed(won) for unresolvable dispute ${dispute.id}`,
      );
      return;
    }

    const { count } = await this.prisma.entitlement.updateMany({
      where: { orderItemId, status: EntitlementStatus.REVOKED },
      data: {
        status: EntitlementStatus.ACTIVE,
        note: `Stripe: dispute ${dispute.id} resolved in your favour — access restored. Any cancelled instalment plan was not automatically resumed.`,
      },
    });
    if (count > 0) {
      this.logger.log(
        `Entitlement for order item ${orderItemId} restored after won dispute ${dispute.id}`,
      );
    }
  }

  /** Revokes the entitlement and, if it belongs to one, cancels its instalment plan. */
  private async revokeForOrderItem(orderItemId: string, note: string) {
    await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { plan: true },
      });
      if (!item) return;

      if (item.plan && item.plan.status !== PlanStatus.CANCELLED) {
        await tx.installmentPlan.update({
          where: { id: item.plan.id },
          data: { status: PlanStatus.CANCELLED },
        });
      }

      await tx.entitlement.updateMany({
        where: { orderItemId },
        data: { status: EntitlementStatus.REVOKED, note },
      });
    });
  }

  /**
   * Resolves a charge or invoice back to the order item it paid for. The
   * invoice path is tried first because every instalment payment — including
   * the first — is billed through an invoice, whereas `Order.stripePaymentIntentId`
   * only ever records the first payment's intent; a later instalment's refund
   * would silently miss a payment-intent-only lookup.
   */
  private async resolveOrderItemId(params: {
    invoiceId?: string | null;
    paymentIntentId?: string | null;
  }): Promise<string | null> {
    const { invoiceId, paymentIntentId } = params;

    if (invoiceId) {
      const invoice = await this.stripe.retrieveInvoice(invoiceId);
      const subscriptionId = this.subscriptionIdOf(invoice);
      if (subscriptionId) {
        const plan = await this.prisma.installmentPlan.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
          select: { orderItemId: true },
        });
        if (plan) return plan.orderItemId;
      }
    }

    if (paymentIntentId) {
      const order = await this.prisma.order.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { items: { select: { id: true }, take: 1 } },
      });
      const item = order?.items[0];
      if (item) return item.id;
    }

    return null;
  }

  /**
   * A dispute carries `payment_intent` directly, so a disputed one-time (or
   * first-instalment) payment resolves with no extra Stripe call. A later
   * instalment's dispute needs one extra hop — charge -> invoice -> subscription
   * — since `Dispute` has no invoice field of its own.
   */
  private async resolveOrderItemIdForDispute(
    dispute: StripeDispute,
  ): Promise<string | null> {
    const paymentIntentId = this.fieldId(dispute, 'payment_intent');
    if (paymentIntentId) {
      const viaOrder = await this.resolveOrderItemId({ paymentIntentId });
      if (viaOrder) return viaOrder;
    }

    const chargeId = this.fieldId(dispute, 'charge');
    if (!chargeId) return null;

    const charge = await this.stripe.retrieveCharge(chargeId);
    const invoiceId = this.fieldId(charge, 'invoice');
    if (!invoiceId) return null;

    return this.resolveOrderItemId({ invoiceId });
  }

  private formatAmount(amountCents: number, currency: string): string {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }

  /**
   * `Invoice.subscription` is not on the typed surface in this SDK major, so
   * it is read defensively rather than cast blindly.
   */
  private subscriptionIdOf(invoice: StripeInvoice): string | null {
    const raw = (invoice as unknown as { subscription?: unknown }).subscription;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object' && 'id' in raw) {
      const id = raw.id;
      return typeof id === 'string' ? id : null;
    }
    return null;
  }

  /**
   * Generic version of `subscriptionIdOf` for the other cross-references a
   * refund/dispute needs to follow (`charge.invoice`, `charge.payment_intent`,
   * `dispute.payment_intent`, `dispute.charge`) — none of which are on the
   * typed surface either, for the same reason.
   */
  private fieldId(obj: unknown, key: string): string | null {
    const raw = (obj as Record<string, unknown> | null | undefined)?.[key];
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object' && 'id' in raw) {
      return typeof raw.id === 'string' ? raw.id : null;
    }
    return null;
  }
}
