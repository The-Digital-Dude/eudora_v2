import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { GuardianAccessService } from './guardian-access.service';

@Module({
  controllers: [FamilyController],
  providers: [FamilyService, GuardianAccessService],
  exports: [FamilyService, GuardianAccessService],
})
export class FamilyModule {}
