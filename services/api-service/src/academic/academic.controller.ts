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
import { AcademicService } from './academic.service';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
} from './dto/academic-year.dto';
import { CreateTermDto, UpdateTermDto } from './dto/term.dto';
import {
  CreateClassSectionDto,
  UpdateClassSectionDto,
} from './dto/class-section.dto';
import {
  CreateCourseClassDto,
  UpdateCourseClassDto,
} from './dto/course-class.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
@UseGuards(RolesGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // --- Academic Year Endpoints ---

  @Post('academic-years')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createAcademicYear(@Body() dto: CreateAcademicYearDto) {
    return this.academicService.createAcademicYear(dto);
  }

  @Get('academic-years')
  async findAllAcademicYears(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.academicService.findAllAcademicYears(pageNum, limitNum);
  }

  @Get('academic-years/:id')
  async findAcademicYearById(@Param('id') id: string) {
    return this.academicService.findAcademicYearById(id);
  }

  @Patch('academic-years/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateAcademicYear(
    @Param('id') id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.academicService.updateAcademicYear(id, dto);
  }

  @Delete('academic-years/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteAcademicYear(@Param('id') id: string) {
    return this.academicService.deleteAcademicYear(id);
  }

  // --- Term Endpoints ---

  @Post('terms')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createTerm(@Body() dto: CreateTermDto) {
    return this.academicService.createTerm(dto);
  }

  @Get('terms')
  async findAllTerms(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.academicService.findAllTerms(pageNum, limitNum, academicYearId);
  }

  @Get('terms/:id')
  async findTermById(@Param('id') id: string) {
    return this.academicService.findTermById(id);
  }

  @Patch('terms/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateTerm(@Param('id') id: string, @Body() dto: UpdateTermDto) {
    return this.academicService.updateTerm(id, dto);
  }

  @Delete('terms/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteTerm(@Param('id') id: string) {
    return this.academicService.deleteTerm(id);
  }

  // --- Class Section Endpoints ---

  @Post('class-sections')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createClassSection(@Body() dto: CreateClassSectionDto) {
    return this.academicService.createClassSection(dto);
  }

  @Get('class-sections')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async findAllClassSections(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('programId') programId?: string,
    @Query('learningSubjectId') learningSubjectId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.academicService.findAllClassSections(
      pageNum,
      limitNum,
      academicYearId,
      programId,
      learningSubjectId,
      search,
      sortBy,
      sortOrder,
    );
  }

  @Get('class-sections/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async findClassSectionById(@Param('id') id: string) {
    return this.academicService.findClassSectionById(id);
  }

  @Get('class-sections/:id/roster')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async getClassSectionRoster(@Param('id') id: string) {
    return this.academicService.getClassSectionRoster(id);
  }

  @Patch('class-sections/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateClassSection(
    @Param('id') id: string,
    @Body() dto: UpdateClassSectionDto,
  ) {
    return this.academicService.updateClassSection(id, dto);
  }

  @Delete('class-sections/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteClassSection(@Param('id') id: string) {
    return this.academicService.deleteClassSection(id);
  }

  // --- Course Class Endpoints ---

  @Post('course-classes')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createCourseClass(@Body() dto: CreateCourseClassDto) {
    return this.academicService.createCourseClass(dto);
  }

  @Get('course-classes')
  async findAllCourseClasses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('termId') termId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.academicService.findAllCourseClasses(pageNum, limitNum, termId);
  }

  @Get('course-classes/:id')
  async findCourseClassById(@Param('id') id: string) {
    return this.academicService.findCourseClassById(id);
  }

  @Patch('course-classes/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateCourseClass(
    @Param('id') id: string,
    @Body() dto: UpdateCourseClassDto,
  ) {
    return this.academicService.updateCourseClass(id, dto);
  }

  @Delete('course-classes/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteCourseClass(@Param('id') id: string) {
    return this.academicService.deleteCourseClass(id);
  }
}
