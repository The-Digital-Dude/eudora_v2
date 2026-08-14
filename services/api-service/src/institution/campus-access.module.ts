import { Module } from '@nestjs/common';
import { CampusAccessService } from './campus-access.service';
import { FamilyModule } from '../family/family.module';

/**
 * Deliberately imports only `FamilyModule` (for `GuardianAccessService`).
 * Keeping this separate from `InstitutionModule` is what lets `AcademicModule`
 * depend on campus checks without inheriting `SubscriptionModule` and the rest
 * of the billing subtree.
 */
@Module({
  imports: [FamilyModule],
  providers: [CampusAccessService],
  exports: [CampusAccessService],
})
export class CampusAccessModule {}
