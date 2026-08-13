import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParentService } from './parent.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { GuardianScopeGuard } from '../auth/guards/guardian-scope.guard';
import { CreateCourseAssignmentDto } from './dto/course-assignment.dto';
import { CreateClassEnrollmentDto } from './dto/class-enrollment.dto';

@Controller('parent')
@UseGuards(RolesGuard)
@Roles('GUARDIAN', 'ADMIN', 'SUPER_ADMIN')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('children')
  async getChildren(@CurrentUser() user: CurrentUserDto) {
    return this.parentService.getChildren(user.id);
  }

  @Get('children/:studentProfileId/teachers')
  @UseGuards(GuardianScopeGuard)
  async getChildTeachers(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildTeachers(studentProfileId);
  }

  @Get('children/:studentProfileId/attendance')
  @UseGuards(GuardianScopeGuard)
  async getChildAttendance(
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.parentService.getChildAttendance(studentProfileId);
  }

  @Get('children/:studentProfileId/homework')
  @UseGuards(GuardianScopeGuard)
  async getChildHomework(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildHomework(studentProfileId);
  }

  @Get('children/:studentProfileId/grades')
  @UseGuards(GuardianScopeGuard)
  async getChildGrades(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildGrades(studentProfileId);
  }

  @Get('children/:studentProfileId/learning')
  @UseGuards(GuardianScopeGuard)
  async getChildLearning(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildLearning(studentProfileId);
  }

  // --- Learning plan (catalog course assignment) ---------------------------
  // `GuardianScopeGuard` resolves `studentProfileId` from the path and asserts
  // the caller is linked to that child (staff bypass it) — the same guard the
  // read routes above already use, so these writes inherit the exact same
  // ownership rule rather than re-implementing it.

  @Get('children/:studentProfileId/available-courses')
  @UseGuards(GuardianScopeGuard)
  async getAvailableCourses(
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.parentService.getAvailableCourses(studentProfileId);
  }

  @Get('children/:studentProfileId/course-assignments')
  @UseGuards(GuardianScopeGuard)
  async getCourseAssignments(
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.parentService.getCourseAssignments(studentProfileId);
  }

  @Post('children/:studentProfileId/course-assignments')
  @UseGuards(GuardianScopeGuard)
  async assignCourse(
    @Param('studentProfileId') studentProfileId: string,
    @Body() dto: CreateCourseAssignmentDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.parentService.assignCourse(
      studentProfileId,
      dto.courseId,
      user.id,
    );
  }

  @Delete('children/:studentProfileId/course-assignments/:courseId')
  @UseGuards(GuardianScopeGuard)
  async removeCourseAssignment(
    @Param('studentProfileId') studentProfileId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.parentService.removeCourseAssignment(
      studentProfileId,
      courseId,
    );
  }

  // --- Class enrollment ------------------------------------------------------
  // Separate from the learning-plan routes above: a `CourseClass` carries
  // real academic weight (gradebook, attendance, homework, capacity), so
  // this only ever touches classes staff explicitly opted in via
  // `isOpenForEnrollment` — never the admin-only `POST /student-enrollments`.

  @Get('children/:studentProfileId/available-classes')
  @UseGuards(GuardianScopeGuard)
  async getAvailableClasses(
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.parentService.getAvailableClasses(studentProfileId);
  }

  @Get('children/:studentProfileId/class-enrollments')
  @UseGuards(GuardianScopeGuard)
  async getClassEnrollments(
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.parentService.getClassEnrollments(studentProfileId);
  }

  @Post('children/:studentProfileId/class-enrollments')
  @UseGuards(GuardianScopeGuard)
  async enrollInClass(
    @Param('studentProfileId') studentProfileId: string,
    @Body() dto: CreateClassEnrollmentDto,
  ) {
    return this.parentService.enrollInClass(
      studentProfileId,
      dto.courseClassId,
    );
  }

  @Delete('children/:studentProfileId/class-enrollments/:enrollmentId')
  @UseGuards(GuardianScopeGuard)
  async removeClassEnrollment(
    @Param('studentProfileId') studentProfileId: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.parentService.removeClassEnrollment(
      studentProfileId,
      enrollmentId,
    );
  }

  @Get('billing/invoices')
  async getInvoices(@CurrentUser() user: CurrentUserDto) {
    return this.parentService.getInvoices(user.id);
  }

  @Get('billing/payments')
  async getPayments(@CurrentUser() user: CurrentUserDto) {
    return this.parentService.getPayments(user.id);
  }
}
