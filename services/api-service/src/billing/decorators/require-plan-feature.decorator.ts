import { SetMetadata } from '@nestjs/common';

export const PLAN_FEATURE_KEY = 'plan_feature';

/**
 * Declares that the route requires the campus's plan to include a specific feature.
 *
 * @example
 * \@RequirePlanFeature('analytics')
 * \@Get('analytics/dashboard')
 * async getDashboard() { ... }
 */
export const RequirePlanFeature = (...features: string[]) =>
  SetMetadata(PLAN_FEATURE_KEY, features);
