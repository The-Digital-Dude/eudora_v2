import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

// EntitlementsModule is imported for ActingStudentService only — these routes
// resolve *which* learner they are about, they do not gate on entitlement.
@Module({
  imports: [PrismaModule, EntitlementsModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
