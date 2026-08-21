import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  BatchSessionsController,
  ScheduleController,
} from './batch-sessions.controller';
import { BatchSessionsService } from './batch-sessions.service';

/**
 * Exported because attendance and live-classes both create sessions and must
 * go through the same validation — they used to each own a `batchSession.create`
 * with different rules.
 */
@Module({
  imports: [PrismaModule],
  controllers: [BatchSessionsController, ScheduleController],
  providers: [BatchSessionsService],
  exports: [BatchSessionsService],
})
export class BatchSessionsModule {}
