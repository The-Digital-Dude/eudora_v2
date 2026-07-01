import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './dto/homework.dto';
import { SubmitHomeworkDto, GradeSubmissionDto } from './dto/submission.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('homework')
@UseGuards(RolesGuard)
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create homework assignment.
   */
  @Post()
  @RequirePermissions({ action: 'create', subject: 'Homework' })
  create(@Body() dto: CreateHomeworkDto, @CurrentUser() user: CurrentUserDto) {
    return this.homeworkService.createHomework(dto, user.id);
  }

  /**
   * Update homework details.
   */
  @Patch(':id')
  @RequirePermissions({ action: 'update', subject: 'Homework' })
  update(@Param('id') id: string, @Body() dto: UpdateHomeworkDto) {
    return this.homeworkService.updateHomework(id, dto);
  }

  /**
   * Get all homework assignments for a course class.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('course-class/:courseClassId')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  getHomeworkForClass(@Param('courseClassId') courseClassId: string) {
    return this.homeworkService.getHomeworkForClass(courseClassId);
  }

  /**
   * Submit homework. Accessible to students.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Post('submit')
  @RequirePermissions({ action: 'create', subject: 'Homework' })
  async submit(
    @Body() dto: SubmitHomeworkDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
    });
    if (!student) {
      throw new ForbiddenException(
        'You do not have a student profile associated with your user account',
      );
    }
    return this.homeworkService.submitHomework(student.id, dto);
  }

  /**
   * Get all submissions for a homework assignment.
   */
  @Get('submissions/homework/:homeworkId')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  getSubmissionsForHomework(@Param('homeworkId') homeworkId: string) {
    return this.homeworkService.getSubmissionsForHomework(homeworkId);
  }

  /**
   * Grade a student's submission.
   */
  @Patch('submissions/:id/grade')
  @RequirePermissions({ action: 'update', subject: 'Homework' })
  grade(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.homeworkService.gradeSubmission(id, dto, user.id);
  }

  /**
   * Get a student's submission history.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('student/:studentProfileId')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  getStudentSubmissions(@Param('studentProfileId') studentProfileId: string) {
    return this.homeworkService.getStudentSubmissions(studentProfileId);
  }

  /**
   * Get a student's pending homework assignments.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('student/:studentProfileId/pending')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  getStudentPendingHomework(
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.homeworkService.getStudentPendingHomework(studentProfileId);
  }

  /**
   * Get current student's pending homework assignments.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('me/pending')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  async getMyPendingHomework(@CurrentUser() user: CurrentUserDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
    });
    if (!student) {
      throw new ForbiddenException(
        'You do not have a student profile associated with your user account',
      );
    }
    return this.homeworkService.getStudentPendingHomework(student.id);
  }
}
