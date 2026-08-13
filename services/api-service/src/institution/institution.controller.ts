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
import { InstitutionService } from './institution.service';
import { CreateCampusDto, UpdateCampusDto } from './dto/campus.dto';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import {
  CreateCampusCourseDto,
  UpdateCampusCourseDto,
} from './dto/campus-course.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanLimitGuard } from '../billing/guards/plan-limit.guard';
import { CheckPlanLimit } from '../billing/decorators/check-plan-limit.decorator';

@Controller()
@UseGuards(RolesGuard)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  // --- Campus Endpoints ---

  @Post('campuses')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createCampus(@Body() dto: CreateCampusDto) {
    return this.institutionService.createCampus(dto);
  }

  @Get('campuses')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAllCampuses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.institutionService.findAllCampuses(
      pageNum,
      limitNum,
      search,
      status,
    );
  }

  @Get('campuses/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findCampusById(@Param('id') id: string) {
    return this.institutionService.findCampusById(id);
  }

  @Patch('campuses/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateCampus(@Param('id') id: string, @Body() dto: UpdateCampusDto) {
    return this.institutionService.updateCampus(id, dto);
  }

  @Delete('campuses/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteCampus(@Param('id') id: string) {
    return this.institutionService.deleteCampus(id);
  }

  // --- Program Endpoints ---

  @Post('programs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(PlanLimitGuard)
  @CheckPlanLimit('programs')
  async createProgram(@Body() dto: CreateProgramDto) {
    return this.institutionService.createProgram(dto);
  }

  @Get('programs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAllPrograms(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('campusId') campusId?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.institutionService.findAllPrograms(
      pageNum,
      limitNum,
      campusId,
      search,
    );
  }

  @Get('programs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findProgramById(@Param('id') id: string) {
    return this.institutionService.findProgramById(id);
  }

  @Patch('programs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateProgram(@Param('id') id: string, @Body() dto: UpdateProgramDto) {
    return this.institutionService.updateProgram(id, dto);
  }

  @Delete('programs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteProgram(@Param('id') id: string) {
    return this.institutionService.deleteProgram(id);
  }

  // --- Campus Course Visibility Endpoints ---
  // Course assignment is a plan/billing-adjacent concern, not content
  // authoring — restricted to ADMIN/SUPER_ADMIN, unlike the Program
  // endpoints above which don't gate on it either but conceptually differ.

  @Get('campuses/:id/courses')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getCampusCourses(@Param('id') id: string) {
    return this.institutionService.getCampusCourses(id);
  }

  @Post('campuses/:id/courses')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async assignCourseToCampus(
    @Param('id') id: string,
    @Body() dto: CreateCampusCourseDto,
  ) {
    return this.institutionService.assignCourseToCampus(id, dto);
  }

  @Patch('campuses/:id/courses/:courseId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateCampusCourse(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCampusCourseDto,
  ) {
    return this.institutionService.updateCampusCourse(id, courseId, dto);
  }

  @Delete('campuses/:id/courses/:courseId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async removeCampusCourse(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
  ) {
    return this.institutionService.removeCampusCourse(id, courseId);
  }
}
