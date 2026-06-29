import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { PlanInterval, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly stripe: any;
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly TRIAL_DAYS = 14;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') ?? '',
      {
        apiVersion: '2026-05-27.dahlia',
      },
    );
  }

  // ─── Create Subscription ────────────────────────────────────────────────────

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

    const interval = dto.interval ?? PlanInterval.MONTHLY;
    const stripePriceId =
      interval === PlanInterval.MONTHLY
        ? plan.stripePriceIdMonthly
        : plan.stripePriceIdAnnual;

    let stripeCustomerId: string | undefined;
    let stripeSubscriptionId: string | undefined;
    let currentPeriodEnd: Date;
    // Client secret for the initial PaymentIntent — the frontend uses this to
    // collect a payment method and confirm the first payment.
    let clientSecret: string | undefined;

    const isFree =
      Number(plan.priceMonthly) === 0 && Number(plan.priceAnnual) === 0;

    if (!isFree && stripePriceId) {
      // Create Stripe customer for campus
      const customer = await this.stripe.customers.create({
        name: campus.name,
        metadata: { campusId: campus.id },
      });
      stripeCustomerId = customer.id;

      // Create Stripe subscription with trial
      const stripeSub = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: stripePriceId }],
        trial_period_days: this.TRIAL_DAYS,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { campusId: campus.id, planId: plan.id },
      });

      stripeSubscriptionId = stripeSub.id;
      currentPeriodEnd = this.resolvePeriodEnd(stripeSub);
      clientSecret =
        stripeSub.latest_invoice?.payment_intent?.client_secret ?? undefined;
    } else {
      // Free plan or no Stripe price — set period manually
      currentPeriodEnd = new Date();
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 100);
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + this.TRIAL_DAYS);

    const subscription = await this.prisma.subscription.create({
      data: {
        campusId: dto.campusId,
        planId: dto.planId,
        stripeCustomerId,
        stripeSubscriptionId,
        status: isFree
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.TRIALING,
        interval,
        currentPeriodStart: new Date(),
        currentPeriodEnd,
        trialEndsAt: isFree ? undefined : trialEndsAt,
      },
      include: { plan: true, campus: true },
    });

    // `clientSecret` is returned (not persisted) so the client can confirm the
    // initial payment for paid plans.
    return { ...subscription, clientSecret };
  }

  /**
   * Reads the current period end from a Stripe subscription, tolerating both
   * the legacy top-level field and the newer per-item placement.
   */
  private resolvePeriodEnd(stripeSub: any): Date {
    const ts =
      stripeSub.current_period_end ??
      stripeSub.items?.data?.[0]?.current_period_end;
    if (ts) return new Date(ts * 1000);
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 1);
    return fallback;
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

    if (subscription.stripeSubscriptionId) {
      const stripeSub = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
      );
      const newStripePriceId =
        interval === PlanInterval.MONTHLY
          ? newPlan.stripePriceIdMonthly
          : newPlan.stripePriceIdAnnual;

      if (newStripePriceId) {
        await this.stripe.subscriptions.update(
          subscription.stripeSubscriptionId,
          {
            items: [
              { id: stripeSub.items.data[0].id, price: newStripePriceId },
            ],
            proration_behavior: 'create_prorations',
          },
        );
      }
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
      // Cancel at period end — user retains access until then
      await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
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
