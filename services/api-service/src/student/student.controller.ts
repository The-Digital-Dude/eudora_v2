import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './student.service';
import {
  CreateStudentProfileDto,
  UpdateMyStudentProfileDto,
  UpdateStudentProfileDto,
} from './dto/student-profile.dto';
import { CreatePlacementDto, UpdatePlacementDto } from './dto/placement.dto';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/enrollment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller()
@UseGuards(RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  // --- Student Profile Endpoints ---

  /**
   * No `@RequirePermissions` here, deliberately — a student doesn't hold
   * `update:Student` (that's a teacher/admin permission for editing other
   * students), and shouldn't need to: this only ever touches the caller's
   * own profile, resolved from the JWT, same pattern as the existing
   * guardian self-service PATCH in family.controller.ts.
   */
  @Roles('USER')
  @Patch('student-profiles/me')
  async updateMyProfile(
    @Body() dto: UpdateMyStudentProfileDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.studentService.updateMyProfile(user.id, dto);
  }

  @Post('student-profiles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'create', subject: 'Student' })
  async createProfile(@Body() dto: CreateStudentProfileDto) {
    return this.studentService.createProfile(dto);
  }

  @Get('student-profiles')
  @RequirePermissions({ action: 'read', subject: 'Student' })
  async findAllProfiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.studentService.findAllProfiles(
      pageNum,
      limitNum,
      status,
      includeArchived === 'true',
      search,
    );
  }

  @Get('student-profiles/:id')
  @RequirePermissions({ action: 'read', subject: 'Student' })
  async findProfileById(@Param('id') id: string) {
    return this.studentService.findProfileById(id);
  }

  @Patch('student-profiles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'update', subject: 'Student' })
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentService.updateProfile(id, dto);
  }

  @Delete('student-profiles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'delete', subject: 'Student' })
  async deleteProfile(@Param('id') id: string) {
    return this.studentService.deleteProfile(id);
  }

  @Post('student-profiles/:id/restore')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'update', subject: 'Student' })
  async restoreProfile(@Param('id') id: string) {
    return this.studentService.restoreProfile(id);
  }

  // --- Student Class Placement Endpoints ---

  @Post('student-placements')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'manage', subject: 'Student' })
  async createPlacement(@Body() dto: CreatePlacementDto) {
    return this.studentService.createPlacement(dto);
  }

  @Get('student-placements')
  @RequirePermissions({ action: 'read', subject: 'Student' })
  async findAllPlacements(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('studentProfileId') studentProfileId?: string,
    @Query('classSectionId') classSectionId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.studentService.findAllPlacements(
      pageNum,
      limitNum,
      studentProfileId,
      classSectionId,
      academicYearId,
    );
  }

  @Get('student-placements/:studentProfileId/:classSectionId')
  @RequirePermissions({ action: 'read', subject: 'Student' })
  async findPlacement(
    @Param('studentProfileId') studentProfileId: string,
    @Param('classSectionId') classSectionId: string,
  ) {
    return this.studentService.findPlacement(studentProfileId, classSectionId);
  }

  @Patch('student-placements/:studentProfileId/:classSectionId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'manage', subject: 'Student' })
  async updatePlacement(
    @Param('studentProfileId') studentProfileId: string,
    @Param('classSectionId') classSectionId: string,
    @Body() dto: UpdatePlacementDto,
  ) {
    return this.studentService.updatePlacement(
      studentProfileId,
      classSectionId,
      dto,
    );
  }

  @Delete('student-placements/:studentProfileId/:classSectionId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'manage', subject: 'Student' })
  async deletePlacement(
    @Param('studentProfileId') studentProfileId: string,
    @Param('classSectionId') classSectionId: string,
  ) {
    return this.studentService.deletePlacement(
      studentProfileId,
      classSectionId,
    );
  }

  // --- Student Course Enrollment Endpoints ---

  @Post('student-enrollments')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'manage', subject: 'Student' })
  async createEnrollment(@Body() dto: CreateEnrollmentDto) {
    return this.studentService.createEnrollment(dto);
  }

  @Get('student-enrollments')
  @RequirePermissions({ action: 'read', subject: 'Student' })
  async findAllEnrollments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('studentProfileId') studentProfileId?: string,
    @Query('courseClassId') courseClassId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.studentService.findAllEnrollments(
      pageNum,
      limitNum,
      studentProfileId,
      courseClassId,
    );
  }

  @Get('student-enrollments/:id')
  @RequirePermissions({ action: 'read', subject: 'Student' })
  async findEnrollmentById(@Param('id') id: string) {
    return this.studentService.findEnrollmentById(id);
  }

  @Patch('student-enrollments/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'manage', subject: 'Student' })
  async updateEnrollment(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.studentService.updateEnrollment(id, dto);
  }

  @Delete('student-enrollments/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'manage', subject: 'Student' })
  async deleteEnrollment(@Param('id') id: string) {
    return this.studentService.deleteEnrollment(id);
  }
}
