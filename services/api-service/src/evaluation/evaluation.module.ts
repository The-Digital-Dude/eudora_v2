import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { MasteryService } from './mastery.service';
import { GapService } from './gap.service';
import { GapsController } from './gaps.controller';
import { NextActionService } from './next-action.service';
import { NextActionsController } from './next-actions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvaluationController, GapsController, NextActionsController],
  providers: [EvaluationService, MasteryService, GapService, NextActionService],
  exports: [EvaluationService, MasteryService, GapService, NextActionService],
})
export class EvaluationModule {}
