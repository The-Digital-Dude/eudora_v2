import { Module } from '@nestjs/common';
import { GradebookService } from './gradebook.service';
import { GradeCalculationService } from './grade-calculation.service';
import { GradebookController } from './gradebook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GradebookController],
  providers: [GradebookService, GradeCalculationService],
  exports: [GradebookService, GradeCalculationService],
})
export class GradebookModule {}
