import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_FEATURE_KEY } from '../decorators/require-plan-feature.decorator';
import { PLAN_LIMIT_KEY, PlanLimitResource } from '../decorators/check-plan-limit.decorator';
import { SubscriptionStatus } from '@prisma/client';

/**
 * PlanLimitGuard
 *
 * Enforces feature flags and resource limits based on a campus's active plan.
 *
 * Usage:
 *   - Attach @RequirePlanFeature('analytics') to gate by plan feature flag
 *   - Attach @CheckPlanLimit('students') to gate by resource count vs plan limit
 *
 * The guard resolves the campusId from route params (`:campusId` or `:id`).
 * For routes where the param name differs, pass it explicitly via the decorator.
 */
@Injectable()
export class PlanLimitGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const limitResource = this.reflector.getAllAndOverride<PlanLimitResource>(
      PLAN_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nothing to enforce — pass through
    if (!requiredFeatures?.length && !limitResource) return true;

    const request = context.switchToHttp().getRequest();
    const campusId: string | undefined =
      request.params?.campusId ?? request.params?.id ?? request.body?.campusId;

    if (!campusId) {
      this.logger.warn(
        'PlanLimitGuard: campusId could not be resolved from request. Allowing by default.',
      );
      return true;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { campusId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No active subscription found for this campus. Please subscribe to a plan.',
      );
    }

    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ];

    if (!activeStatuses.includes(subscription.status)) {
      throw new ForbiddenException(
        `Subscription is ${subscription.status.toLowerCase()}. Please renew your plan to continue.`,
      );
    }

    const plan = subscription.plan;

    // ── Feature flag check ────────────────────────────────────────────────────
    if (requiredFeatures?.length) {
      const missingFeatures = requiredFeatures.filter(
        (f) => !plan.features.includes(f),
      );
      if (missingFeatures.length > 0) {
        throw new ForbiddenException(
          `Your current plan does not include: ${missingFeatures.join(', ')}. Please upgrade.`,
        );
      }
    }

    // ── Resource limit check ──────────────────────────────────────────────────
    if (limitResource) {
      await this.checkResourceLimit(campusId, limitResource, plan);
    }

    return true;
  }

  private async checkResourceLimit(
    campusId: string,
    resource: PlanLimitResource,
    plan: { maxStudents: number | null; maxPrograms: number | null; maxCampuses: number | null },
  ): Promise<void> {
    switch (resource) {
      case 'students': {
        if (plan.maxStudents === null) return; // unlimited
        const count = await this.prisma.studentProfile.count({
          where: {
            placements: {
              some: {
                classSection: {
                  program: { campusId },
                },
              },
            },
          },
        });
        if (count >= plan.maxStudents) {
          throw new ForbiddenException(
            `Student limit reached (${count}/${plan.maxStudents}). Please upgrade your plan.`,
          );
        }
        break;
      }

      case 'programs': {
        if (plan.maxPrograms === null) return; // unlimited
        const count = await this.prisma.program.count({ where: { campusId } });
        if (count >= plan.maxPrograms) {
          throw new ForbiddenException(
            `Program limit reached (${count}/${plan.maxPrograms}). Please upgrade your plan.`,
          );
        }
        break;
      }

      case 'campuses': {
        // campuses limit is checked globally, not per-campus
        if (plan.maxCampuses === null) return;
        const count = await this.prisma.campus.count();
        if (count >= plan.maxCampuses) {
          throw new ForbiddenException(
            `Campus limit reached (${count}/${plan.maxCampuses}). Please upgrade your plan.`,
          );
        }
        break;
      }
    }
  }
}
