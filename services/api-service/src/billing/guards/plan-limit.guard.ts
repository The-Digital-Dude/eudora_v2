import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PLAN_LIMIT_KEY,
  PlanLimitResource,
} from '../decorators/check-plan-limit.decorator';
import { SubscriptionStatus } from '@prisma/client';

/**
 * PlanLimitGuard
 *
 * Enforces resource limits based on a campus's active plan.
 *
 * Usage:
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
    const limitResource = this.reflector.getAllAndOverride<PlanLimitResource>(
      PLAN_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nothing to enforce — pass through
    if (!limitResource) return true;

    const request = context.switchToHttp().getRequest();
    let campusId: string | undefined =
      request.params?.campusId ?? request.params?.id ?? request.body?.campusId;

    // Student placement requests carry a classSectionId, not a campusId
    // directly (StudentProfile/TeacherProfile have no campusId column —
    // same reason InstitutionService.resolveCampusIdsForUser has to
    // traverse this chain for catalog visibility). Resolve it the same way.
    if (!campusId && request.body?.classSectionId) {
      const classSection = await this.prisma.classSection.findUnique({
        where: { id: request.body.classSectionId },
        select: { program: { select: { campusId: true } } },
      });
      campusId = classSection?.program.campusId;
    }

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

    await this.checkResourceLimit(campusId, limitResource, plan);

    return true;
  }

  private async checkResourceLimit(
    campusId: string,
    resource: PlanLimitResource,
    plan: {
      maxStudents: number | null;
      maxPrograms: number | null;
    },
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

    }
  }
}
