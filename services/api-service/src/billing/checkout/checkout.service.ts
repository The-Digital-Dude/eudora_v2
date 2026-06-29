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
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreatePortalDto } from './dto/create-portal.dto';
import { PlanInterval } from '@prisma/client';

/**
 * CheckoutService
 *
 * Drives the customer-facing payment flow using Stripe Checkout (a hosted,
 * PCI-compliant payment page) and the Stripe Billing Portal (self-service
 * management of payment methods, invoices and cancellation).
 *
 * The actual local Subscription record is created once Stripe confirms the
 * payment via the `checkout.session.completed` webhook — see
 * StripeWebhookService.
 */
@Injectable()
export class CheckoutService {
  private readonly stripe: any;
  private readonly logger = new Logger(CheckoutService.name);
  private readonly TRIAL_DAYS = 14;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') ?? '',
      { apiVersion: '2026-05-27.dahlia' },
    );
  }

  private frontendUrl(): string {
    return (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  // ─── Create Checkout Session ────────────────────────────────────────────────

  /**
   * Creates a Stripe Checkout Session for subscribing a campus to a paid plan.
   * Returns the hosted Checkout URL the client should redirect the user to.
   */
  async createCheckoutSession(dto: CreateCheckoutDto) {
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

    const interval = dto.interval ?? PlanInterval.MONTHLY;
    const stripePriceId =
      interval === PlanInterval.MONTHLY
        ? plan.stripePriceIdMonthly
        : plan.stripePriceIdAnnual;

    const isFree =
      Number(plan.priceMonthly) === 0 && Number(plan.priceAnnual) === 0;
    if (isFree || !stripePriceId) {
      throw new BadRequestException(
        'This plan is free or not configured for online payment. ' +
          'Create the subscription directly via the subscriptions endpoint.',
      );
    }

    // Create a dedicated Stripe customer for the campus so the resulting
    // subscription / invoices are grouped and the billing portal works later.
    const customer = await this.stripe.customers.create({
      name: campus.name,
      metadata: { campusId: campus.id },
    });

    const base = this.frontendUrl();
    const successUrl =
      dto.successUrl ??
      `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = dto.cancelUrl ?? `${base}/billing/cancel`;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: this.TRIAL_DAYS,
        metadata: {
          campusId: campus.id,
          planId: plan.id,
          interval,
        },
      },
      // Mirror the metadata on the session so the webhook can resolve it
      // straight from `checkout.session.completed`.
      metadata: {
        campusId: campus.id,
        planId: plan.id,
        interval,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    this.logger.log(
      `Created checkout session ${session.id} for campus ${campus.id} (plan ${plan.id})`,
    );

    return { url: session.url, sessionId: session.id };
  }

  // ─── Create Billing Portal Session ──────────────────────────────────────────

  /**
   * Creates a Stripe Billing Portal session so an admin can manage payment
   * methods, view invoices and cancel/upgrade the campus subscription.
   */
  async createPortalSession(dto: CreatePortalDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { campusId: dto.campusId },
    });
    if (!subscription) {
      throw new NotFoundException('No subscription found for this campus');
    }
    if (!subscription.stripeCustomerId) {
      throw new BadRequestException(
        'This subscription has no associated Stripe customer (free plan?).',
      );
    }

    const returnUrl = dto.returnUrl ?? `${this.frontendUrl()}/billing`;

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }
}
