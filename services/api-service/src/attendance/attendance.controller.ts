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
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('attendance')
@UseGuards(RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Bulk record or update daily attendance for a homeroom / class section.
   */
  @Post('daily')
  @RequirePermissions({ action: 'create', subject: 'Attendance' })
  recordDaily(@Body() dto: RecordDailyAttendanceDto, @CurrentUser() user: any) {
    return this.attendanceService.recordDailyAttendance(dto, user.id);
  }

  /**
   * Get daily attendance records for a class section on a specific date.
   */
  @Get('daily/class-section/:classSectionId')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getDaily(
    @Param('classSectionId') classSectionId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDailyAttendance(classSectionId, date);
  }

  /**
   * Create a new subject session / lecture slot.
   */
  @Post('sessions')
  @RequirePermissions({ action: 'create', subject: 'Attendance' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.attendanceService.createSession(dto);
  }

  /**
   * Get all sessions created for a course class.
   */
  @Get('sessions/course-class/:courseClassId')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getSessions(@Param('courseClassId') courseClassId: string) {
    return this.attendanceService.getSessionsForCourse(courseClassId);
  }

  /**
   * Bulk record or update attendance for a specific lecture session.
   */
  @Post('session-attendance')
  @RequirePermissions({ action: 'create', subject: 'Attendance' })
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
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getSessionAttendance(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSessionAttendance(sessionId);
  }

  /**
   * Get summary statistics report for a single student (both daily and subject-level).
   */
  @Get('student/:studentProfileId/summary')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
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

  /**
   * Get interactive daily roster sheet for a class section.
   */
  @Get('daily/class-section/:classSectionId/sheet')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getClassDailySheet(
    @Param('classSectionId') classSectionId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getClassDailySheet(classSectionId, date);
  }

  /**
   * Get class section attendance overview reports within a date range.
   */
  @Get('reports/class-section/:classSectionId')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getClassAttendanceSummary(
    @Param('classSectionId') classSectionId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getClassAttendanceSummary(
      classSectionId,
      startDate,
      endDate,
    );
  }

  /**
   * Get monthly attendance overview summary.
   */
  @Get('reports/monthly')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getMonthlyAttendanceSummary(
    @Query('month') month: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('classSectionId') classSectionId?: string,
  ) {
    return this.attendanceService.getMonthlyAttendanceSummary(
      month,
      academicYearId,
      classSectionId,
    );
  }

  /**
   * Get historical trends of absences and tardiness.
   */
  @Get('reports/absence-trends')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getAbsenceTrends(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('classSectionId') classSectionId?: string,
  ) {
    return this.attendanceService.getAbsenceTrends(
      startDate,
      endDate,
      classSectionId,
    );
  }

  /**
   * Get list of students whose attendance rate falls below threshold.
   */
  @Get('reports/at-risk')
  @RequirePermissions({ action: 'read', subject: 'Attendance' })
  getAtRiskAttendanceStudents(
    @Query('threshold') threshold: string,
    @Query('academicYearId') academicYearId: string,
    @Query('classSectionId') classSectionId?: string,
  ) {
    const thresholdNum = threshold ? parseFloat(threshold) : 85;
    return this.attendanceService.getAtRiskAttendanceStudents(
      thresholdNum,
      academicYearId,
      classSectionId,
    );
  }
}
