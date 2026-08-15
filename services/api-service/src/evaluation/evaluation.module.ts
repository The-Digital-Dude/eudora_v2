import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { MasteryService } from './mastery.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [PrismaModule, FamilyModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, MasteryService],
  exports: [EvaluationService, MasteryService],
})
export class EvaluationModule {}
