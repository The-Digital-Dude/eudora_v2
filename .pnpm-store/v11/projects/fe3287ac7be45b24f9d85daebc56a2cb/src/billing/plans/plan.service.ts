import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import type { StripeClient } from '../stripe/stripe.types';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan } from '@prisma/client';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  private get stripe(): StripeClient {
    return this.stripeService.client;
  }

  private isFree(plan: { priceMonthly: unknown; priceAnnual: unknown }) {
    return Number(plan.priceMonthly) === 0 && Number(plan.priceAnnual) === 0;
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Plan with name "${dto.name}" already exists`,
      );
    }

    const plan = await this.prisma.plan.create({
      data: {
        ...dto,
        priceMonthly: dto.priceMonthly,
        priceAnnual: dto.priceAnnual,
        features: dto.features ?? [],
      },
    });

    // Provision the Stripe product/prices so the plan is immediately usable in
    // Checkout. Best-effort: a Stripe outage should not fail plan creation, and
    // the admin can retry via POST /billing/plans/:id/sync-stripe.
    if (!this.isFree(plan) && this.stripeService.isConfigured) {
      try {
        return await this.syncToStripe(plan.id);
      } catch (err) {
        this.logger.error(
          `Plan ${plan.id} created but Stripe sync failed: ${(err as Error).message}. ` +
            'Retry with POST /billing/plans/:id/sync-stripe.',
        );
      }
    }

    return plan;
  }

  /**
   * Creates or updates the Stripe Product and recurring Prices backing a plan.
   *
   * Stripe Prices are immutable, so a changed amount means creating a new Price
   * and pointing the plan at it. Existing subscriptions stay on the old price
   * until they are explicitly migrated — deliberate, so a pricing change never
   * silently re-bills current customers.
   */
  async syncToStripe(id: string): Promise<Plan> {
    const plan = await this.findOne(id);

    if (!this.stripeService.isConfigured) {
      throw new BadRequestException(
        'Stripe is not configured on this server. Set STRIPE_SECRET_KEY first.',
      );
    }
    if (this.isFree(plan)) {
      throw new BadRequestException(
        'Free plans do not need Stripe prices — they never go through Checkout.',
      );
    }

    // 1. Product
    let productId: string;
    if (plan.stripeProductId) {
      productId = plan.stripeProductId;
      await this.stripe.products.update(productId, {
        name: plan.name,
        description: plan.description ?? undefined,
        active: true,
      });
    } else {
      const product = await this.stripe.products.create({
        name: plan.name,
        description: plan.description ?? undefined,
        metadata: { planId: plan.id },
      });
      productId = product.id;
    }

    // 2. Prices — one per interval, recreated only when the amount changed.
    const currency = (plan.currency || 'USD').toLowerCase();
    const monthlyPriceId = await this.ensurePrice(
      productId,
      currency,
      Number(plan.priceMonthly),
      'month',
      plan.stripePriceIdMonthly,
    );
    const annualPriceId = await this.ensurePrice(
      productId,
      currency,
      Number(plan.priceAnnual),
      'year',
      plan.stripePriceIdAnnual,
    );

    const updated = await this.prisma.plan.update({
      where: { id: plan.id },
      data: {
        stripeProductId: productId,
        stripePriceIdMonthly: monthlyPriceId,
        stripePriceIdAnnual: annualPriceId,
      },
    });

    this.logger.log(`Synced plan ${plan.id} to Stripe product ${productId}`);
    return updated;
  }

  /**
   * Returns a Stripe Price id matching the given amount/interval, reusing the
   * existing one when its amount already matches.
   */
  private async ensurePrice(
    productId: string,
    currency: string,
    amount: number,
    interval: 'month' | 'year',
    existingPriceId: string | null,
  ): Promise<string | null> {
    if (amount <= 0) return existingPriceId;

    const unitAmount = Math.round(amount * 100);

    if (existingPriceId) {
      try {
        const price = await this.stripe.prices.retrieve(existingPriceId);
        const matches =
          price.unit_amount === unitAmount &&
          price.currency === currency &&
          price.recurring?.interval === interval &&
          price.active;
        if (matches) return existingPriceId;

        // Deactivate the stale price so it stops appearing in Stripe's UI.
        await this.stripe.prices.update(existingPriceId, { active: false });
      } catch {
        this.logger.warn(
          `Stored price ${existingPriceId} could not be read from Stripe; creating a new one`,
        );
      }
    }

    const created = await this.stripe.prices.create({
      product: productId,
      currency,
      unit_amount: unitAmount,
      recurring: { interval },
    });
    return created.id;
  }

  async findAllPublic() {
    return this.prisma.plan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { priceMonthly: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    const existing = await this.findOne(id);

    if (dto.name) {
      const conflict = await this.prisma.plan.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Plan with name "${dto.name}" already exists`,
        );
      }
    }

    const updated = await this.prisma.plan.update({
      where: { id },
      data: dto,
    });

    // Re-sync when anything Stripe cares about changed.
    const pricingChanged =
      (dto.priceMonthly !== undefined &&
        Number(dto.priceMonthly) !== Number(existing.priceMonthly)) ||
      (dto.priceAnnual !== undefined &&
        Number(dto.priceAnnual) !== Number(existing.priceAnnual)) ||
      (dto.currency !== undefined && dto.currency !== existing.currency);
    const descriptorChanged =
      (dto.name !== undefined && dto.name !== existing.name) ||
      (dto.description !== undefined && dto.description !== existing.description);

    if (
      (pricingChanged || descriptorChanged) &&
      !this.isFree(updated) &&
      this.stripeService.isConfigured
    ) {
      try {
        return await this.syncToStripe(id);
      } catch (err) {
        this.logger.error(
          `Plan ${id} updated but Stripe sync failed: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  async remove(id: string) {
    const plan = await this.findOne(id);

    // Soft-delete: just deactivate the plan so existing subscriptions are unaffected
    const deactivated = await this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });

    // Archive in Stripe too, so it cannot be selected in new Checkout sessions.
    if (plan.stripeProductId && this.stripeService.isConfigured) {
      try {
        await this.stripe.products.update(plan.stripeProductId, {
          active: false,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to archive Stripe product for plan ${id}: ${(err as Error).message}`,
        );
      }
    }

    return deactivated;
  }
}
