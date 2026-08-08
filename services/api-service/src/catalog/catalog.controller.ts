import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import {
  CreateLearningSubjectDto,
  UpdateLearningSubjectDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateLearningPathDto,
  UpdateLearningPathDto,
  AddCourseToPathDto,
  ReorderPathCoursesDto,
} from './dto/catalog.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'];

function isStaff(user?: CurrentUserDto): boolean {
  return !!user && user.roles.some((r) => STAFF_ROLES.includes(r));
}

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('catalog')
@UseGuards(RolesGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ─── Learning Subjects ───────────────────────────────────────────────────

  @Get('subjects')
  listLearningSubjects() {
    return this.catalogService.listLearningSubjects();
  }

  @Post('subjects')
  @Roles('SUPER_ADMIN', 'ADMIN')
  createLearningSubject(@Body() dto: CreateLearningSubjectDto) {
    return this.catalogService.createLearningSubject(dto);
  }

  @Patch('subjects/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  updateLearningSubject(
    @Param('id') id: string,
    @Body() dto: UpdateLearningSubjectDto,
  ) {
    return this.catalogService.updateLearningSubject(id, dto);
  }

  // ─── Courses ─────────────────────────────────────────────────────────────

  @Get('courses')
  listCourses(
    @Query('subjectId') subjectId?: string,
    @CurrentUser() user?: CurrentUserDto,
  ) {
    return this.catalogService.listCourses(subjectId, isStaff(user));
  }

  @Get('courses/:id')
  getCourseDetail(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.catalogService.getCourseDetail(id, user.id, isStaff(user));
  }

  @Post('courses')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.catalogService.createCourse(dto);
  }

  @Patch('courses/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.catalogService.updateCourse(id, dto);
  }

  // ─── Learning Paths ──────────────────────────────────────────────────────

  @Get('paths')
  listLearningPaths(@Query('subjectId') subjectId?: string) {
    return this.catalogService.listLearningPaths(subjectId);
  }

  @Get('paths/:id')
  getLearningPathDetail(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.catalogService.getLearningPathDetail(id, user.id);
  }

  @Post('paths')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  createLearningPath(@Body() dto: CreateLearningPathDto) {
    return this.catalogService.createLearningPath(dto);
  }

  @Patch('paths/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  updateLearningPath(
    @Param('id') id: string,
    @Body() dto: UpdateLearningPathDto,
  ) {
    return this.catalogService.updateLearningPath(id, dto);
  }

  @Post('paths/:id/courses')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  addCourseToPath(@Param('id') id: string, @Body() dto: AddCourseToPathDto) {
    return this.catalogService.addCourseToPath(id, dto);
  }

  @Patch('paths/:id/courses/reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  reorderPathCourses(
    @Param('id') id: string,
    @Body() dto: ReorderPathCoursesDto,
  ) {
    return this.catalogService.reorderPathCourses(id, dto);
  }

  @Delete('paths/:id/courses/:courseId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  removeCourseFromPath(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
  ) {
    return this.catalogService.removeCourseFromPath(id, courseId);
  }
}
