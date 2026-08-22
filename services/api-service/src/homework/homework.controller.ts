import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  Headers,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './dto/homework.dto';
import { SubmitHomeworkDto, GradeSubmissionDto } from './dto/submission.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { GuardianAccessService } from '../family/guardian-access.service';
import {
  ACTING_STUDENT_HEADER,
  ActingStudentService,
} from '../entitlements/acting-student.service';
import { UploadsService } from '../uploads/uploads.service';
import { HomeworkAttachmentAccessService } from './homework-attachment-access.service';
import {
  assertStudentWorkUpload,
  MAX_STUDENT_WORK_BYTES,
} from '../common/files/student-work.validator';

/** Where handed-in work lives in the private store. */
const HOMEWORK_ATTACHMENT_PREFIX = 'homework-submissions';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('homework')
@UseGuards(RolesGuard)
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly actingStudent: ActingStudentService,
    private readonly uploads: UploadsService,
    private readonly attachmentAccess: HomeworkAttachmentAccessService,
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
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
  @Get('batch/:batchId')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  getHomeworkForClass(@Param('batchId') batchId: string) {
    return this.homeworkService.getHomeworkForClass(batchId);
  }

  /**
   * Submit homework. Accessible to students.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Post('submit')
  @RequirePermissions({ action: 'attempt', subject: 'Homework' })
  async submit(
    @Body() dto: SubmitHomeworkDto,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    // Resolved through the acting-student rules, not from the caller's own
    // profile. The old lookup was `studentProfile where userId = caller`, which
    // meant a guardian always failed — they have no student profile of their
    // own — while the child they are submitting for has no password and cannot
    // sign in to do it themselves.
    const studentProfileId = await this.actingStudent.resolve(
      user.id,
      actingStudentId ?? null,
    );
    if (!studentProfileId) {
      throw new ForbiddenException(
        'Select which child you are submitting for, or sign in as the learner',
      );
    }
    return this.homeworkService.submitHomework(studentProfileId, dto, {
      userId: user.id,
      roles: user.roles ?? [],
    });
  }

  /**
   * Checkpoint homework for a course, for the people who mark it.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @Get('course/:courseId')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  async getHomeworkForCourse(@Param('courseId') courseId: string) {
    return this.homeworkService.getHomeworkForCourse(courseId);
  }

  /**
   * The whole course at a glance: every checkpoint against every learner
   * entitled to it, including the ones who have not started.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @Get('course/:courseId/progress')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  async getCourseHomeworkProgress(@Param('courseId') courseId: string) {
    return this.homeworkService.getCourseHomeworkProgress(courseId);
  }

  /**
   * Stores one file privately and hands back its id, to be named in a
   * subsequent submit call.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Post('attachments')
  @RequirePermissions({ action: 'attempt', subject: 'Homework' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_STUDENT_WORK_BYTES } }),
  )
  async uploadAttachment(
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserDto,
  ) {
    assertStudentWorkUpload(file);
    const stored = await this.uploads.uploadPrivateFile(
      file,
      user.id,
      HOMEWORK_ATTACHMENT_PREFIX,
    );
    return {
      id: stored.id,
      originalName: stored.originalName,
      size: stored.size,
      mimetype: stored.mimetype,
    };
  }

  /**
   * Serves a handed-in file to someone entitled to read it. Never a public URL.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('attachments/:fileId')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  async downloadAttachment(
    @Param('fileId') fileId: string,
    @CurrentUser() user: CurrentUserDto,
    @Res() res: Response,
  ) {
    await this.attachmentAccess.assertCanRead(fileId, user);
    const file = await this.uploads.readPrivateFile(fileId);

    if (file.kind === 'redirect') {
      return res.redirect(file.url);
    }
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.originalName)}"`,
    );
    return res.send(file.body);
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
  async getStudentSubmissions(
    @Param('studentProfileId') studentProfileId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      studentProfileId,
    );
    return this.homeworkService.getStudentSubmissions(studentProfileId);
  }

  /**
   * Get a student's pending homework assignments.
   */
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('student/:studentProfileId/pending')
  @RequirePermissions({ action: 'read', subject: 'Homework' })
  async getStudentPendingHomework(
    @Param('studentProfileId') studentProfileId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      studentProfileId,
    );
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
