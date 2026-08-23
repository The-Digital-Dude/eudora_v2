import {
  Controller,
  Get,
  Headers,
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
  AttachCourseTeacherDto,
} from './dto/catalog.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import {
  ACTING_STUDENT_HEADER,
  ActingStudentService,
} from '../entitlements/acting-student.service';

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'];

function isStaff(user?: CurrentUserDto): boolean {
  return !!user && user.roles.some((r) => STAFF_ROLES.includes(r));
}

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('catalog')
@UseGuards(RolesGuard)
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly actingStudent: ActingStudentService,
  ) {}

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

  /**
   * Anonymous search for the marketing site — no auth, no role check.
   * catalogService.listPublicCourses hardcodes PUBLISHED-only and a fixed,
   * safe field selection, so there's nothing here to accidentally over-expose.
   */
  @Public()
  @Get('public/courses')
  async listPublicCourses(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.listPublicCourses(
      search,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /**
   * Anonymous SKU surface for the marketing site. Unlike `public/courses`
   * above these DO return price — a programme page that cannot show its price
   * cannot sell — but never Stripe ids, and never a non-PUBLISHED row.
   */
  @Public()
  @Get('public/programs')
  async listPublicPrograms(
    @Query('classSlug') classSlug?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.listPublicPrograms(
      classSlug,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Public()
  @Get('public/programs/:slug')
  async getPublicProgram(@Param('slug') slug: string) {
    return this.catalogService.getPublicProgramBySlug(slug);
  }

  @Public()
  @Get('public/courses/:slug')
  async getPublicCourse(@Param('slug') slug: string) {
    return this.catalogService.getPublicCourseBySlug(slug);
  }

  @Public()
  @Get('public/classes')
  async listPublicClasses() {
    return this.catalogService.listPublicClasses();
  }

  /**
   * The per-learner fields here (`isAssigned`, progress) used to come from
   * `user.studentProfile.id`, which is null for a guardian — so the audience
   * that actually picks courses saw a list with every personalised field
   * blank. Resolved through the same acting-student rules as `courses/:id`
   * below, which was already header-aware; the pair disagreeing meant a
   * guardian could open a course and see progress the list had just told them
   * did not exist.
   */
  @Get('courses')
  async listCourses(
    @Query('subjectId') subjectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @CurrentUser() user?: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    return this.catalogService.listCourses(
      subjectId,
      isStaff(user),
      await this.actingStudent.resolve(user?.id, actingStudentId ?? null),
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      search,
      sortBy,
      sortOrder,
    );
  }

  @Get('courses/:id')
  async getCourseDetail(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    return this.catalogService.getCourseDetail(
      id,
      user.id,
      isStaff(user),
      user.roles,
      actingStudentId ?? null,
    );
  }

  @Post('courses')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.catalogService.createCourse(dto);
  }

  // ─── Course teaching staff ───────────────────────────────────────────────

  @Get('courses/:id/teachers')
  listCourseTeachers(@Param('id') id: string) {
    return this.catalogService.listCourseTeachers(id);
  }

  @Post('courses/:id/teachers')
  @Roles('SUPER_ADMIN', 'ADMIN')
  attachCourseTeacher(
    @Param('id') id: string,
    @Body() dto: AttachCourseTeacherDto,
  ) {
    return this.catalogService.attachCourseTeacher(
      id,
      dto.teacherProfileId,
      dto.role,
    );
  }

  @Delete('courses/:id/teachers/:teacherProfileId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  detachCourseTeacher(
    @Param('id') id: string,
    @Param('teacherProfileId') teacherProfileId: string,
  ) {
    return this.catalogService.detachCourseTeacher(id, teacherProfileId);
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
