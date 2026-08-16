import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingMode, EntitlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import {
  MIN_SELLABLE_PRICE_CENTS,
  installmentTerms,
  offersInstallments,
  upgradePrice,
} from '../pricing/pricing';

export type SkuType = 'PROGRAM' | 'COURSE';

export type SkuResolution =
  | 'AVAILABLE'
  | 'OWNED'
  | 'UPGRADE'
  | 'BLOCKED_ACTIVE_PLAN'
  | 'NOT_SELLABLE';

export interface ResolvedSku {
  resolution: SkuResolution;
  skuType: SkuType;
  skuId: string;
  title: string;
  currency: string;
  listPriceCents: number | null;
  /** What this buyer would actually be charged, after any upgrade credit. */
  priceCents: number | null;
  creditAppliedCents: number;
  /** Courses already owned that are contained in this program. */
  overlappingCourseIds: string[];
  installmentsAvailable: boolean;
  installmentCount: number | null;
  amountPerInstallmentCents: number | null;
  finalInstallmentCents: number | null;
  message?: string;
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Decides what this student may buy and at what price, before any money
   * moves. Runs entirely server-side — the client's view of price and
   * ownership is never trusted.
   */
  async resolveSku(
    studentProfileId: string,
    skuType: SkuType,
    skuId: string,
  ): Promise<ResolvedSku> {
    const base = {
      skuType,
      skuId,
      creditAppliedCents: 0,
      overlappingCourseIds: [] as string[],
      installmentsAvailable: false,
      installmentCount: null,
      amountPerInstallmentCents: null,
      finalInstallmentCents: null,
    };

    const activeWhere = {
      studentProfileId,
      status: EntitlementStatus.ACTIVE,
    };

    if (skuType === 'COURSE') {
      const course = await this.prisma.course.findFirst({
        where: { id: skuId, deletedAt: null, status: 'PUBLISHED' },
      });
      if (!course) throw new NotFoundException('Course not found');

      // Owned directly, or via a program that contains it.
      const owned = await this.prisma.entitlement.findFirst({
        where: {
          ...activeWhere,
          OR: [
            { courseId: course.id },
            { program: { programCourses: { some: { courseId: course.id } } } },
          ],
        },
      });
      if (owned) {
        return {
          ...base,
          resolution: 'OWNED',
          title: course.title,
          currency: course.currency,
          listPriceCents: course.priceOneTimeCents,
          priceCents: null,
          message: 'Already enrolled in this course',
        };
      }

      if (!course.priceOneTimeCents) {
        return {
          ...base,
          resolution: 'NOT_SELLABLE',
          title: course.title,
          currency: course.currency,
          listPriceCents: null,
          priceCents: null,
          message: 'This course is only available as part of a programme',
        };
      }

      const installments = offersInstallments(course);
      const terms = installments
        ? installmentTerms(course.priceOneTimeCents, course.installmentCount!)
        : null;

      return {
        ...base,
        resolution: 'AVAILABLE',
        title: course.title,
        currency: course.currency,
        listPriceCents: course.priceOneTimeCents,
        priceCents: course.priceOneTimeCents,
        installmentsAvailable: installments,
        installmentCount: terms?.installmentCount ?? null,
        amountPerInstallmentCents: terms?.amountPerInstallmentCents ?? null,
        finalInstallmentCents: terms?.finalInstallmentCents ?? null,
      };
    }

    const program = await this.prisma.program.findFirst({
      where: { id: skuId, status: 'PUBLISHED' },
      include: { programCourses: { select: { courseId: true } } },
    });
    if (!program) throw new NotFoundException('Programme not found');

    const owned = await this.prisma.entitlement.findFirst({
      where: { ...activeWhere, programId: program.id },
    });
    if (owned) {
      return {
        ...base,
        resolution: 'OWNED',
        title: program.name,
        currency: program.currency,
        listPriceCents: program.priceOneTimeCents,
        priceCents: null,
        message: 'Already enrolled in this programme',
      };
    }

    if (!program.priceOneTimeCents) {
      return {
        ...base,
        resolution: 'NOT_SELLABLE',
        title: program.name,
        currency: program.currency,
        listPriceCents: null,
        priceCents: null,
        message: 'This programme is not currently on sale',
      };
    }

    // Courses inside this program the student already bought a la carte.
    const containedIds = program.programCourses.map((pc) => pc.courseId);
    const overlapping = containedIds.length
      ? await this.prisma.entitlement.findMany({
          where: { ...activeWhere, courseId: { in: containedIds } },
          include: {
            orderItem: { select: { priceCents: true } },
            course: { select: { id: true, priceOneTimeCents: true } },
          },
        })
      : [];

    // An overlapping course still mid-installment would need proration to
    // upgrade cleanly. Deliberately blocked rather than approximated.
    const blocked = await this.prisma.installmentPlan.findFirst({
      where: {
        status: 'ACTIVE',
        orderItem: {
          studentProfileId,
          courseId: { in: containedIds },
        },
      },
    });
    if (blocked) {
      return {
        ...base,
        resolution: 'BLOCKED_ACTIVE_PLAN',
        title: program.name,
        currency: program.currency,
        listPriceCents: program.priceOneTimeCents,
        priceCents: null,
        overlappingCourseIds: overlapping.map((e) => e.courseId!),
        message:
          'Finish the instalment plan on your existing course before upgrading',
      };
    }

    // Credit what was actually paid, falling back to list price for grants
    // that carry no order.
    const alreadyPaidCents = overlapping.reduce(
      (sum, e) =>
        sum + (e.orderItem?.priceCents ?? e.course?.priceOneTimeCents ?? 0),
      0,
    );

    const { priceCents, creditAppliedCents } = upgradePrice(
      program.priceOneTimeCents,
      alreadyPaidCents,
    );

    const installments = offersInstallments(program);
    const terms = installments
      ? installmentTerms(priceCents, program.installmentCount!)
      : null;

    return {
      ...base,
      resolution: creditAppliedCents > 0 ? 'UPGRADE' : 'AVAILABLE',
      title: program.name,
      currency: program.currency,
      listPriceCents: program.priceOneTimeCents,
      priceCents,
      creditAppliedCents,
      overlappingCourseIds: overlapping.map((e) => e.courseId!),
      installmentsAvailable: installments,
      installmentCount: terms?.installmentCount ?? null,
      amountPerInstallmentCents: terms?.amountPerInstallmentCents ?? null,
      finalInstallmentCents: terms?.finalInstallmentCents ?? null,
    };
  }

  /**
   * Creates the pending Order and hands back a Stripe Checkout URL.
   *
   * The order is written before redirecting so the webhook has a row to
   * reconcile against even if the buyer closes the tab mid-payment.
   */
  /**
   * Batches (`Batch`) that can still take a seat for this course.
   *
   * A LIVE course is unsellable without one, which is exactly why self-paced
   * is the default: it sells every day of the year, while live can only sell
   * into an open cohort.
   */
  async listOpenBatches(courseId: string) {
    const now = new Date();
    const batches = await this.prisma.batch.findMany({
      where: {
        courseId,
        deletedAt: null,
        status: 'ACTIVE',
        isOpenForEnrollment: true,
        OR: [
          { enrollmentDeadline: null },
          { enrollmentDeadline: { gte: now } },
        ],
      },
      orderBy: [{ startDate: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        enrollmentDeadline: true,
        capacity: true,
        leadTeacher: { select: { id: true, fullName: true } },
        _count: { select: { enrollments: true } },
      },
    });

    return batches
      .map((b) => ({
        ...b,
        seatsLeft:
          b.capacity === null ? null : b.capacity - b._count.enrollments,
      }))
      .filter((b) => b.seatsLeft === null || b.seatsLeft > 0);
  }

  /**
   * Re-checks a chosen batch server-side. The client's list of open batches is
   * a convenience; capacity and deadline are only true at the moment of
   * purchase, and two buyers can race for the last seat.
   */
  private async assertBatchSellable(courseId: string, batchId: string) {
    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, deletedAt: null },
      select: {
        id: true,
        courseId: true,
        status: true,
        isOpenForEnrollment: true,
        capacity: true,
        enrollmentDeadline: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!batch || batch.courseId !== courseId) {
      throw new BadRequestException('That batch is not part of this course');
    }
    if (batch.status !== 'ACTIVE' || !batch.isOpenForEnrollment) {
      throw new BadRequestException('That batch is not open for enrolment');
    }
    if (batch.enrollmentDeadline && batch.enrollmentDeadline < new Date()) {
      throw new BadRequestException('Enrolment for that batch has closed');
    }
    if (batch.capacity !== null && batch._count.enrollments >= batch.capacity) {
      throw new BadRequestException('That batch is full');
    }
  }

  async createCheckoutSession(params: {
    guardianUserId: string;
    studentProfileId: string;
    skuType: SkuType;
    skuId: string;
    billingMode: BillingMode;
    /** Required when the course is delivered LIVE. */
    batchId?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    if (params.billingMode === BillingMode.SUBSCRIPTION) {
      throw new BadRequestException('Subscription billing is not enabled');
    }

    await this.assertGuardianOwnsStudent(
      params.guardianUserId,
      params.studentProfileId,
    );

    const sku = await this.resolveSku(
      params.studentProfileId,
      params.skuType,
      params.skuId,
    );

    if (sku.resolution !== 'AVAILABLE' && sku.resolution !== 'UPGRADE') {
      throw new BadRequestException(
        sku.message ?? 'This item cannot be bought',
      );
    }
    if (!sku.priceCents || sku.priceCents < MIN_SELLABLE_PRICE_CENTS) {
      throw new BadRequestException('This item is not purchasable');
    }
    if (
      params.billingMode === BillingMode.INSTALLMENT &&
      !sku.installmentsAvailable
    ) {
      throw new BadRequestException(
        'Instalments are not offered for this item',
      );
    }

    // A LIVE course is a seat in a dated cohort, so the batch is part of what
    // is being bought — validated here, before any money moves.
    let batchId: string | null = null;
    if (params.skuType === 'COURSE') {
      const course = await this.prisma.course.findFirst({
        where: { id: params.skuId },
        select: { deliveryMode: true },
      });
      if (course?.deliveryMode === 'LIVE') {
        if (!params.batchId) {
          throw new BadRequestException(
            'Choose a batch before enrolling in a live course',
          );
        }
        await this.assertBatchSellable(params.skuId, params.batchId);
        batchId = params.batchId;
      }
    }

    const isInstallment = params.billingMode === BillingMode.INSTALLMENT;

    const order = await this.prisma.order.create({
      data: {
        guardianUserId: params.guardianUserId,
        status: 'PENDING',
        totalCents: sku.priceCents,
        currency: sku.currency,
        items: {
          create: {
            studentProfileId: params.studentProfileId,
            programId: params.skuType === 'PROGRAM' ? params.skuId : null,
            courseId: params.skuType === 'COURSE' ? params.skuId : null,
            batchId,
            billingMode: params.billingMode,
            priceCents: sku.priceCents,
            installmentCount: isInstallment ? sku.installmentCount : null,
            creditAppliedCents: sku.creditAppliedCents,
          },
        },
      },
      include: { items: true },
    });

    const orderItem = order.items[0];

    const guardian = await this.prisma.user.findUnique({
      where: { id: params.guardianUserId },
      select: { email: true },
    });

    // The success page needs the order id to poll, and Stripe only gives back
    // its own session id. Appending it here rather than in the controller is
    // what lets the caller stay ignorant of the order until it exists.
    const successUrl = params.successUrl.includes('?')
      ? `${params.successUrl}&orderId=${order.id}`
      : `${params.successUrl}?orderId=${order.id}`;

    // `cancel_at` is what makes this an instalment plan rather than an
    // open-ended subscription — Stripe stops after the final charge.
    const cancelAt = isInstallment
      ? new Date(
          Date.now() + (sku.installmentCount ?? 1) * 30 * 24 * 60 * 60 * 1000,
        )
      : undefined;

    // The order is written before redirecting so the webhook has something to
    // reconcile against if the buyer abandons the tab mid-payment. But if the
    // session never gets created there is no payment flow at all, so the order
    // must not be left sitting at PENDING forever — mark it FAILED rather than
    // accumulating orphans on every Stripe outage or misconfiguration.
    let session: Awaited<ReturnType<StripeService['createCheckoutSession']>>;
    try {
      session = await this.stripe.createCheckoutSession({
        mode: isInstallment ? 'subscription' : 'payment',
        priceCents: isInstallment
          ? (sku.amountPerInstallmentCents ?? sku.priceCents)
          : sku.priceCents,
        currency: sku.currency,
        productName: sku.title,
        customerEmail: guardian?.email,
        successUrl,
        cancelUrl: params.cancelUrl,
        cancelAt,
        metadata: {
          orderId: order.id,
          orderItemId: orderItem.id,
          studentProfileId: params.studentProfileId,
        },
      });
    } catch (err) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : null,
      },
    });

    return { orderId: order.id, checkoutUrl: session.url };
  }

  /**
   * A guardian may only buy for a child they are linked to. Without this any
   * authenticated user could grant entitlements to an arbitrary student by
   * passing someone else's profile id.
   */
  private async assertGuardianOwnsStudent(
    guardianUserId: string,
    studentProfileId: string,
  ) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId: guardianUserId },
      select: { id: true },
    });
    if (!guardian) {
      throw new ForbiddenException('Only guardians can purchase for a student');
    }
    const link = await this.prisma.guardianStudentRelationship.findUnique({
      where: {
        guardianProfileId_studentProfileId: {
          guardianProfileId: guardian.id,
          studentProfileId,
        },
      },
      select: { studentProfileId: true },
    });
    if (!link) {
      throw new ForbiddenException(
        'That student is not linked to your account',
      );
    }
  }

  async getOrder(orderId: string, guardianUserId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, guardianUserId },
      include: {
        items: {
          include: {
            program: { select: { id: true, name: true, slug: true } },
            course: { select: { id: true, title: true, slug: true } },
            plan: true,
            entitlement: { select: { id: true, status: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Hands the guardian off to Stripe's own billing UI for card updates and
   * instalment cancellation. Requires a Stripe customer, which only exists
   * once they have actually paid for something.
   */
  async createBillingPortalSession(guardianUserId: string, returnUrl: string) {
    const withCustomer = await this.prisma.order.findFirst({
      where: { guardianUserId, stripeCustomerId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { stripeCustomerId: true },
    });

    if (!withCustomer?.stripeCustomerId) {
      throw new NotFoundException(
        'No billing account yet — this appears after your first purchase',
      );
    }

    const session = await this.stripe.createBillingPortalSession(
      withCustomer.stripeCustomerId,
      returnUrl,
    );
    return { url: session.url };
  }

  /**
   * Everything a guardian owns, grouped by child. Drives the "what have I
   * bought" view, which is distinct from order history: an admin grant or a
   * refund changes what is owned without there being an order to show.
   */
  async listEntitlementsForGuardian(guardianUserId: string) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId: guardianUserId },
      select: { id: true },
    });
    if (!guardian) return [];

    const links = await this.prisma.guardianStudentRelationship.findMany({
      where: { guardianProfileId: guardian.id },
      select: {
        studentProfile: {
          select: {
            id: true,
            fullName: true,
            entitlements: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                source: true,
                accessExpiresAt: true,
                paidThroughDate: true,
                program: { select: { id: true, name: true, slug: true } },
                course: { select: { id: true, title: true, slug: true } },
                batch: {
                  select: { id: true, name: true, endDate: true },
                },
                orderItem: {
                  select: {
                    plan: {
                      select: {
                        installmentsPaid: true,
                        installmentCount: true,
                        status: true,
                        paidThroughDate: true,
                        amountPerInstallmentCents: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return links.map((l) => ({
      studentProfileId: l.studentProfile.id,
      fullName: l.studentProfile.fullName,
      entitlements: l.studentProfile.entitlements,
    }));
  }

  async listOrders(guardianUserId: string, limit = 20) {
    return this.prisma.order.findMany({
      where: { guardianUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        items: {
          include: {
            program: { select: { id: true, name: true, slug: true } },
            course: { select: { id: true, title: true, slug: true } },
            plan: {
              select: {
                installmentsPaid: true,
                installmentCount: true,
                status: true,
                paidThroughDate: true,
              },
            },
          },
        },
      },
    });
  }
}
