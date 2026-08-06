import { Module } from '@nestjs/common';
import { GradebookService } from './gradebook.service';
import { GradeCalculationService } from './grade-calculation.service';
import { GradebookController } from './gradebook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [PrismaModule, FamilyModule],
  controllers: [GradebookController],
  providers: [GradebookService, GradeCalculationService],
  exports: [GradebookService, GradeCalculationService],
})
export class GradebookModule {}
