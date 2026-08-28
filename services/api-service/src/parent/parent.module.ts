import { Module } from '@nestjs/common';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FamilyModule } from '../family/family.module';
import { InstitutionModule } from '../institution/institution.module';
import { CatalogModule } from '../catalog/catalog.module';
import { StudentModule } from '../student/student.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [
    PrismaModule,
    FamilyModule,
    InstitutionModule,
    CatalogModule,
    StudentModule,
    // For the entitlement-derived half of getChildTeachers: a guardian-portal
    // child has no class placement, so their teachers come from the courses
    // they own rather than from a section they were never put in.
    EntitlementsModule,
  ],
  controllers: [ParentController],
  providers: [ParentService],
  exports: [ParentService],
})
export class ParentModule {}
