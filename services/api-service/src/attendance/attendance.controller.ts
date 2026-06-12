import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { RecordDailyAttendanceDto } from './dto/record-daily-attendance.dto';
import {
  CreateSessionDto,
  RecordSessionAttendanceDto,
} from './dto/record-session-attendance.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('attendance')
@UseGuards(RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Bulk record or update daily attendance for a homeroom / class section.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Post('daily')
  recordDaily(
    @Body() dto: RecordDailyAttendanceDto,
    @CurrentUser() user: any,
  ) {
    return this.attendanceService.recordDailyAttendance(dto, user.id);
  }

  /**
   * Get daily attendance records for a class section on a specific date.
   */
  @Get('daily/class-section/:classSectionId')
  getDaily(
    @Param('classSectionId') classSectionId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDailyAttendance(classSectionId, date);
  }

  /**
   * Create a new subject session / lecture slot.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.attendanceService.createSession(dto);
  }

  /**
   * Get all sessions created for a course class.
   */
  @Get('sessions/course-class/:courseClassId')
  getSessions(@Param('courseClassId') courseClassId: string) {
    return this.attendanceService.getSessionsForCourse(courseClassId);
  }

  /**
   * Bulk record or update attendance for a specific lecture session.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Post('session-attendance')
  recordSession(
    @Body() dto: RecordSessionAttendanceDto,
    @CurrentUser() user: any,
  ) {
    return this.attendanceService.recordSessionAttendance(dto, user.id);
  }

  /**
   * Get attendance sheet for a specific lecture session.
   */
  @Get('session-attendance/session/:sessionId')
  getSessionAttendance(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSessionAttendance(sessionId);
  }

  /**
   * Get summary statistics report for a single student (both daily and subject-level).
   */
  @Get('student/:studentProfileId/summary')
  getStudentSummary(
    @Param('studentProfileId') studentProfileId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getStudentSummary(
      studentProfileId,
      startDate,
      endDate,
    );
  }
}
