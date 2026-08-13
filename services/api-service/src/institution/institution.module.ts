import { Module } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { InstitutionController } from './institution.controller';
import { FamilyModule } from '../family/family.module';
import { SubscriptionModule } from '../billing/subscriptions/subscription.module';

@Module({
  imports: [FamilyModule, SubscriptionModule],
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
