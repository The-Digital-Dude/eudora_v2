import { Module } from '@nestjs/common';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FamilyModule } from '../family/family.module';
import { InstitutionModule } from '../institution/institution.module';
import { CatalogModule } from '../catalog/catalog.module';
import { StudentModule } from '../student/student.module';

@Module({
  imports: [
    PrismaModule,
    FamilyModule,
    InstitutionModule,
    CatalogModule,
    StudentModule,
  ],
  controllers: [ParentController],
  providers: [ParentService],
  exports: [ParentService],
})
export class ParentModule {}
