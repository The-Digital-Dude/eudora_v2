import { SetMetadata } from '@nestjs/common';

// 'campuses' is deliberately absent: POST /campuses has no campusId to resolve
// a subscription from — the campus doesn't exist yet, and its Free-plan
// subscription is only created after the row is inserted. The check is
// semantically premature on that route, so the resource isn't offered.
export type PlanLimitResource = 'students' | 'programs';

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
