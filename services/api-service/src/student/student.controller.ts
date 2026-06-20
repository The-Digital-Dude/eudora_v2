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
  UpdateStudentProfileDto,
} from './dto/student-profile.dto';
import { CreatePlacementDto, UpdatePlacementDto } from './dto/placement.dto';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/enrollment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller()
@UseGuards(RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  // --- Student Profile Endpoints ---

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
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.studentService.findAllProfiles(pageNum, limitNum, status);
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
