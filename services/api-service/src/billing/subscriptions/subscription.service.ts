import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import type {
  StripeClient,
  StripeSubscription,
} from '../stripe/stripe.types';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PlanInterval, SubscriptionStatus, Plan } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly TRIAL_DAYS = 14;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  private get stripe(): StripeClient {
    return this.stripeService.client;
  }

  /**
   * The billing period lives on the subscription *item*, not the subscription,
   * as of Stripe API 2025-03+. Reading `sub.current_period_end` yields
   * undefined and produces an Invalid Date.
   */
  private periodFromSubscription(sub: StripeSubscription): {
    start: Date;
    end: Date;
  } {
    const item = sub.items?.data?.[0];
    if (!item) {
      throw new BadRequestException(
        `Stripe subscription ${sub.id} has no items; cannot determine billing period`,
      );
    }
    return {
      start: new Date(item.current_period_start * 1000),
      end: new Date(item.current_period_end * 1000),
    };
  }

  private isFreePlan(plan: Plan): boolean {
    return Number(plan.priceMonthly) === 0 && Number(plan.priceAnnual) === 0;
  }

  private priceIdFor(plan: Plan, interval: PlanInterval): string | null {
    return interval === PlanInterval.MONTHLY
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdAnnual;
  }

  private assertStripeReady() {
    if (!this.stripeService.isConfigured) {
      throw new BadRequestException(
        'Stripe is not configured on this server. Set STRIPE_SECRET_KEY to enable paid plans.',
      );
    }
  }

  // ─── Create Subscription ────────────────────────────────────────────────────

  /**
   * Creates a subscription record directly.
   *
   * Only valid for free plans — a paid plan requires a payment method, which is
   * collected through Stripe Checkout. See `createCheckoutSession`.
   */
  async create(dto: CreateSubscriptionDto) {
    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
      include: { subscription: true },
    });
    if (!campus) throw new NotFoundException('Campus not found');
    if (campus.subscription) {
      throw new ConflictException('Campus already has an active subscription');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive)
      throw new NotFoundException('Plan not found or inactive');

    if (!this.isFreePlan(plan)) {
      throw new BadRequestException(
        'This plan requires payment. Start a Stripe Checkout session via ' +
          'POST /billing/subscriptions/checkout-session instead.',
      );
    }

    const interval = dto.interval ?? PlanInterval.MONTHLY;

    // Free plans never expire; use a far-future sentinel so period checks pass.
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 100);

    return this.prisma.subscription.create({
      data: {
        campusId: dto.campusId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        interval,
        currentPeriodStart: new Date(),
        currentPeriodEnd,
      },
      include: { plan: true, campus: true },
    });
  }

  // ─── Checkout ────────────────────────────────────────────────────────────────

  /**
   * Creates a Stripe Checkout session for a paid plan and returns its URL.
   *
   * The caller redirects the browser to that URL; Stripe hosts the card form,
   * handles SCA/3DS, then creates the subscription and notifies us via the
   * `checkout.session.completed` webhook. The local Subscription row is written
   * by the webhook handler, not here — the payment is not confirmed until then.
   */
  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    this.assertStripeReady();

    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
      include: { subscription: true },
    });
    if (!campus) throw new NotFoundException('Campus not found');
    if (campus.subscription) {
      throw new ConflictException('Campus already has an active subscription');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found or inactive');
    }
    if (this.isFreePlan(plan)) {
      throw new BadRequestException(
        'This plan is free. Create the subscription directly via POST /billing/subscriptions.',
      );
    }

    const interval = dto.interval ?? PlanInterval.MONTHLY;
    const priceId = this.priceIdFor(plan, interval);
    if (!priceId) {
      throw new BadRequestException(
        `Plan "${plan.name}" has no Stripe price configured for ${interval}. ` +
          'Sync the plan to Stripe first (POST /billing/plans/:id/sync-stripe).',
      );
    }

    // Reuse the campus's Stripe customer across attempts so a retried checkout
    // does not create duplicate customers.
    const customerId = await this.resolveCustomerId(campus.id, campus.name);

    const baseUrl = this.stripeService.appUrl;
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: this.TRIAL_DAYS,
          metadata: { campusId: campus.id, planId: plan.id, interval },
        },
        // Echoed back on the completed event so the webhook can resolve which
        // campus and plan this checkout belongs to.
        metadata: { campusId: campus.id, planId: plan.id, interval },
        success_url: `${baseUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/dashboard/billing?checkout=cancelled`,
      },
      // Guards against double-submit creating two checkouts for one campus+plan.
      { idempotencyKey: `checkout:${campus.id}:${plan.id}:${interval}` },
    );

    this.logger.log(
      `Created checkout session ${session.id} for campus ${campus.id}, plan ${plan.id}`,
    );

    return { sessionId: session.id, url: session.url };
  }

  /** Finds an existing Stripe customer for the campus, or creates one. */
  private async resolveCustomerId(
    campusId: string,
    campusName: string,
  ): Promise<string> {
    const existing = await this.prisma.subscription.findFirst({
      where: { campusId, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      name: campusName,
      metadata: { campusId },
    });
    return customer.id;
  }

  /**
   * Creates a Stripe Billing Portal session so an admin can update their card,
   * view invoices, or cancel — without us rebuilding any of that UI.
   */
  async createPortalSession(campusId: string) {
    this.assertStripeReady();

    const subscription = await this.prisma.subscription.findUnique({
      where: { campusId },
    });
    if (!subscription?.stripeCustomerId) {
      throw new NotFoundException(
        'No Stripe customer exists for this campus yet',
      );
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.stripeService.appUrl}/dashboard/billing`,
    });

    return { url: session.url };
  }

  // ─── Get Campus Subscription ─────────────────────────────────────────────────

  async findByCampus(campusId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { campusId },
      include: {
        plan: true,
        campus: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!subscription) {
      throw new NotFoundException('No subscription found for this campus');
    }
    return subscription;
  }

  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, campus: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  // ─── Change Plan ──────────────────────────────────────────────────────────────

  async changePlan(id: string, dto: ChangePlanDto) {
    const subscription = await this.findOne(id);

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException(
        'Cannot change plan of a canceled subscription',
      );
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!newPlan || !newPlan.isActive) {
      throw new NotFoundException('Target plan not found or inactive');
    }

    const interval = dto.interval ?? subscription.interval;

    // Moving from a free plan (no Stripe subscription) onto a paid one needs a
    // payment method, so it has to go through Checkout rather than an update.
    if (!subscription.stripeSubscriptionId && !this.isFreePlan(newPlan)) {
      throw new BadRequestException(
        'Upgrading from a free plan requires payment. Start a Stripe Checkout ' +
          'session via POST /billing/subscriptions/checkout-session.',
      );
    }

    // Downgrading to a free plan: there is nothing left to bill, so end the
    // Stripe subscription rather than trying to swap in a price that
    // does not exist.
    if (subscription.stripeSubscriptionId && this.isFreePlan(newPlan)) {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100);

      return this.prisma.subscription.update({
        where: { id },
        data: {
          planId: dto.planId,
          interval,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: null,
          currentPeriodEnd: farFuture,
          canceledAt: null,
        },
        include: { plan: true },
      });
    }

    if (subscription.stripeSubscriptionId) {
      const newPriceId = this.priceIdFor(newPlan, interval);
      if (!newPriceId) {
        throw new BadRequestException(
          `Plan "${newPlan.name}" has no Stripe price configured for ${interval}. ` +
            'Sync the plan to Stripe first (POST /billing/plans/:id/sync-stripe).',
        );
      }

      const stripeSub = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
      );

      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{ id: stripeSub.items.data[0].id, price: newPriceId }],
        proration_behavior: 'create_prorations',
        metadata: { campusId: subscription.campusId, planId: newPlan.id },
      });
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { planId: dto.planId, interval },
      include: { plan: true },
    });
  }

  // ─── Cancel Subscription ──────────────────────────────────────────────────────

  async cancel(id: string) {
    const subscription = await this.findOne(id);

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is already canceled');
    }

    if (subscription.stripeSubscriptionId) {
      // Cancel at period end — user retains access until then. The local status
      // flips to CANCELED when Stripe emits customer.subscription.deleted.
      await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { canceledAt: new Date() },
      include: { plan: true },
    });
  }

  // ─── Get Usage Stats ──────────────────────────────────────────────────────────

  async getUsageStats(campusId: string) {
    const subscription = await this.findByCampus(campusId);
    const plan = subscription.plan;

    const [studentCount, programCount] = await Promise.all([
      this.prisma.studentProfile.count({
        where: {
          placements: {
            some: {
              classSection: {
                program: { campusId },
              },
            },
          },
        },
      }),
      this.prisma.program.count({ where: { campusId } }),
    ]);

    return {
      subscription,
      usage: {
        students: {
          used: studentCount,
          limit: plan.maxStudents ?? null,
          exceeded:
            plan.maxStudents !== null
              ? studentCount >= plan.maxStudents
              : false,
        },
        programs: {
          used: programCount,
          limit: plan.maxPrograms ?? null,
          exceeded:
            plan.maxPrograms !== null
              ? programCount >= plan.maxPrograms
              : false,
        },
      },
    };
  }
}
