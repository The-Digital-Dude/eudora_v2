import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import type { StripeCheckoutSession, StripeEvent } from './stripe-types';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Thin wrapper over the Stripe SDK plus product/price synchronisation.
 *
 * Deliberately degrades instead of throwing at construction: the repo has no
 * Stripe keys configured, and a missing key must not stop the whole API from
 * booting. `isConfigured` is false in that case and every call that needs
 * Stripe raises a 503 with an actionable message.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: InstanceType<typeof Stripe> | null;
  readonly webhookSecret: string | undefined;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set — checkout and webhooks are disabled. ' +
          'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable billing.',
      );
      this.client = null;
      return;
    }

    this.client = new Stripe(secretKey);
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  private require(): InstanceType<typeof Stripe> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Billing is not configured on this server',
      );
    }
    return this.client;
  }

  // --- Product / price synchronisation --------------------------------------
  // Created lazily on the transition to PUBLISHED rather than on every save:
  // a 50-course catalogue would otherwise churn 150+ Stripe objects on each
  // admin edit.

  /**
   * Ensures a Stripe Product and its Prices exist for a Program, storing the
   * ids back. Idempotent — safe to call on every publish.
   */
  async syncProgram(programId: string): Promise<void> {
    const stripe = this.require();
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
    });
    if (!program) return;

    let productId: string | null = program.stripeProductId;
    if (!productId) {
      const product = await stripe.products.create({
        name: program.name,
        description: program.shortDescription ?? undefined,
        metadata: { programId: program.id, slug: program.slug },
      });
      productId = product.id;
    }

    const data: {
      stripeProductId: string;
      stripePriceOneTimeId?: string;
      stripePriceMonthlyId?: string;
    } = { stripeProductId: productId };

    if (program.priceOneTimeCents && !program.stripePriceOneTimeId) {
      const price = await stripe.prices.create({
        product: productId,
        currency: program.currency.toLowerCase(),
        unit_amount: program.priceOneTimeCents,
      });
      data.stripePriceOneTimeId = price.id;
    }

    if (program.priceMonthlyCents && !program.stripePriceMonthlyId) {
      const price = await stripe.prices.create({
        product: productId,
        currency: program.currency.toLowerCase(),
        unit_amount: program.priceMonthlyCents,
        recurring: { interval: 'month' },
      });
      data.stripePriceMonthlyId = price.id;
    }

    await this.prisma.program.update({ where: { id: programId }, data });
  }

  /** Same contract as `syncProgram`, for a-la-carte Courses. */
  async syncCourse(courseId: string): Promise<void> {
    const stripe = this.require();
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) return;

    let productId: string | null = course.stripeProductId;
    if (!productId) {
      const product = await stripe.products.create({
        name: course.title,
        description: course.description ?? undefined,
        metadata: { courseId: course.id, slug: course.slug },
      });
      productId = product.id;
    }

    const data: {
      stripeProductId: string;
      stripePriceOneTimeId?: string;
      stripePriceMonthlyId?: string;
    } = { stripeProductId: productId };

    if (course.priceOneTimeCents && !course.stripePriceOneTimeId) {
      const price = await stripe.prices.create({
        product: productId,
        currency: course.currency.toLowerCase(),
        unit_amount: course.priceOneTimeCents,
      });
      data.stripePriceOneTimeId = price.id;
    }

    if (course.priceMonthlyCents && !course.stripePriceMonthlyId) {
      const price = await stripe.prices.create({
        product: productId,
        currency: course.currency.toLowerCase(),
        unit_amount: course.priceMonthlyCents,
        recurring: { interval: 'month' },
      });
      data.stripePriceMonthlyId = price.id;
    }

    await this.prisma.course.update({ where: { id: courseId }, data });
  }

  // --- Checkout -------------------------------------------------------------

  /**
   * Hosted Checkout, not Elements: it handles SCA, 3DS and wallets out of the
   * box and keeps this server out of PCI scope.
   */
  async createCheckoutSession(params: {
    mode: 'payment' | 'subscription';
    priceCents: number;
    currency: string;
    productName: string;
    quantity?: number;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
    /** Set for installments so the plan self-terminates after the final charge. */
    cancelAt?: Date;
  }): Promise<StripeCheckoutSession> {
    const stripe = this.require();

    return stripe.checkout.sessions.create({
      mode: params.mode,
      line_items: [
        {
          quantity: params.quantity ?? 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.priceCents,
            product_data: { name: params.productName },
            ...(params.mode === 'subscription'
              ? { recurring: { interval: 'month' as const } }
              : {}),
          },
        },
      ],
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      ...(params.mode === 'subscription'
        ? {
            subscription_data: {
              metadata: params.metadata,
              ...(params.cancelAt
                ? { cancel_at: Math.floor(params.cancelAt.getTime() / 1000) }
                : {}),
            },
          }
        : {}),
    });
  }

  /**
   * Hosted Billing Portal session.
   *
   * Card management, invoice history and instalment cancellation all live in
   * Stripe's own UI. Rebuilding any of that here would mean handling card
   * details, which is exactly what hosted Checkout was chosen to avoid.
   */
  async createBillingPortalSession(customerId: string, returnUrl: string) {
    const stripe = this.require();
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Verifies the signature over the RAW request body. `rawBody` is already
   * enabled in main.ts, and the response-envelope filter already exempts this
   * path — without both, the signature check would fail on a re-serialised body.
   */
  constructWebhookEvent(rawBody: Buffer, signature: string): StripeEvent {
    const stripe = this.require();
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
