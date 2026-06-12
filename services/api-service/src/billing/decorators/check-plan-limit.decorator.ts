import { SetMetadata } from '@nestjs/common';

export type PlanLimitResource = 'students' | 'programs' | 'campuses';

export const PLAN_LIMIT_KEY = 'plan_limit';

/**
 * Declares that the route should check whether the campus is within
 * its plan's limit for a specific resource before allowing creation.
 *
 * @example
 * \@CheckPlanLimit('students')
 * \@Post()
 * async createStudent() { ... }
 */
export const CheckPlanLimit = (resource: PlanLimitResource) =>
  SetMetadata(PLAN_LIMIT_KEY, resource);
