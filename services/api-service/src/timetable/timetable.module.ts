import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableConflictService } from './timetable-conflict.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimetableController],
  providers: [TimetableService, TimetableConflictService],
  exports: [TimetableService, TimetableConflictService],
})
export class TimetableModule {}
