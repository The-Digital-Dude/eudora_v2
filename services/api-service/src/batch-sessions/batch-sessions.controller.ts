import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { BatchSessionsService } from './batch-sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateOneOffSessionDto,
  GenerateSessionsDto,
  UpdateMeetingPatternDto,
} from './dto/batch-session.dto';

/**
 * Schedule management for one cohort. Sits under /batches/:id because a
 * schedule belongs to a batch — the same reason the meeting pattern lives on
 * `Batch` rather than on `Course`: each cohort is sold with its own timetable.
 */
@Controller('batches/:batchId')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
export class BatchSessionsController {
  constructor(
    private readonly batchSessions: BatchSessionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('sessions')
  async listSessions(@Param('batchId') batchId: string) {
    return this.batchSessions.listSessions(batchId);
  }

  @Put('meeting-pattern')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateMeetingPattern(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateMeetingPatternDto,
  ) {
    return this.prisma.batch.update({
      where: { id: batchId },
      data: {
        meetingDays: dto.meetingDays,
        meetingStartMinutes: dto.meetingStartMinutes,
        meetingDurationMinutes: dto.meetingDurationMinutes,
      },
      select: {
        id: true,
        meetingDays: true,
        meetingStartMinutes: true,
        meetingDurationMinutes: true,
      },
    });
  }

  /**
   * Dry run. Returns exactly what `generate` would write, including the dates
   * it would skip, so the operator sees the damage before committing.
   */
  @Post('sessions/preview')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async previewSessions(
    @Param('batchId') batchId: string,
    @Body() dto: GenerateSessionsDto,
  ) {
    return this.batchSessions.planSessions(batchId, dto);
  }

  @Post('sessions/generate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async generateSessions(
    @Param('batchId') batchId: string,
    @Body() dto: GenerateSessionsDto,
  ) {
    return this.batchSessions.generateSessions(batchId, dto);
  }

  /** A one-off outside the pattern — a make-up class, an extra revision hour. */
  @Post('sessions')
  async createSession(
    @Param('batchId') batchId: string,
    @Body() dto: CreateOneOffSessionDto,
  ) {
    return this.batchSessions.createSession({ batchId, ...dto });
  }

  @Delete('sessions/:sessionId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteSession(@Param('sessionId') sessionId: string) {
    return this.batchSessions.deleteSession(sessionId);
  }
}

/**
 * Schedule reads that are not scoped to one batch. These replace the
 * Timetable-backed endpoints of the same name, which resolved through
 * StudentClassPlacement and so returned nothing for any student who arrived
 * through checkout.
 */
@Controller('schedule')
@UseGuards(RolesGuard)
export class ScheduleController {
  constructor(private readonly batchSessions: BatchSessionsService) {}

  @Get('student/:studentProfileId')
  async studentSchedule(
    @Param('studentProfileId') studentProfileId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.batchSessions.getStudentSchedule(studentProfileId, {
      from,
      to,
    });
  }

  @Get('teacher/:teacherProfileId')
  async teacherSchedule(
    @Param('teacherProfileId') teacherProfileId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.batchSessions.getTeacherSchedule(teacherProfileId, {
      from,
      to,
    });
  }
}
