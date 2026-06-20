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
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('homework')
@UseGuards(RolesGuard)
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create homework assignment. Restricted to SUPER_ADMIN, ADMIN, and TEACHER.
   */
  @Post()
  create(@Body() dto: CreateHomeworkDto, @CurrentUser() user: any) {
    return this.homeworkService.createHomework(dto, user.id);
  }

  /**
   * Update homework details. Restricted to SUPER_ADMIN, ADMIN, and TEACHER.
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHomeworkDto) {
    return this.homeworkService.updateHomework(id, dto);
  }

  /**
   * Get all homework assignments for a course class.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('course-class/:courseClassId')
  getHomeworkForClass(@Param('courseClassId') courseClassId: string) {
    return this.homeworkService.getHomeworkForClass(courseClassId);
  }

  /**
   * Submit homework. Accessible to students (USER/STUDENT role).
   * Resolves the student profile ID using the current user's ID.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Post('submit')
  async submit(@Body() dto: SubmitHomeworkDto, @CurrentUser() user: any) {
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
   * Get all submissions for a homework assignment. Restricted to teachers/admins.
   */
  @Get('submissions/homework/:homeworkId')
  getSubmissionsForHomework(@Param('homeworkId') homeworkId: string) {
    return this.homeworkService.getSubmissionsForHomework(homeworkId);
  }

  /**
   * Grade a student's submission. Restricted to teachers/admins.
   */
  @Patch('submissions/:id/grade')
  grade(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: any,
  ) {
    return this.homeworkService.gradeSubmission(id, dto, user.id);
  }

  /**
   * Get a student's submission history.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('student/:studentProfileId')
  getStudentSubmissions(@Param('studentProfileId') studentProfileId: string) {
    return this.homeworkService.getStudentSubmissions(studentProfileId);
  }
}
