import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './dto/homework.dto';
import { SubmitHomeworkDto, GradeSubmissionDto } from './dto/submission.dto';
import { SubmissionStatus } from '@prisma/client';
import { GradebookService } from '../gradebook/gradebook.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { MAX_ATTACHMENTS_PER_SUBMISSION } from '../common/files/student-work.validator';

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradebookService: GradebookService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ─── Homework Assignments Operations ────────────────────────────────────────

  async createHomework(dto: CreateHomeworkDto, recordedByUserId?: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException('Course class not found');
    }

    const due = new Date(dto.dueDate);
    if (isNaN(due.getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    return this.prisma.homework.create({
      data: {
        batchId: dto.batchId,
        title: dto.title,
        description: dto.description,
        dueDate: due,
        maxPoints: dto.maxPoints,
        attachmentUrls: dto.attachmentUrls || [],
        recordedById: recordedByUserId,
      },
    });
  }

  async updateHomework(id: string, dto: UpdateHomeworkDto) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
    });
    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    let due = homework.dueDate;
    if (dto.dueDate) {
      due = new Date(dto.dueDate);
      if (isNaN(due.getTime())) {
        throw new BadRequestException('Invalid due date format');
      }
    }

    return this.prisma.homework.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        dueDate: dto.dueDate ? due : undefined,
        maxPoints: dto.maxPoints ?? undefined,
        attachmentUrls: dto.attachmentUrls ?? undefined,
      },
    });
  }

  async getHomeworkForClass(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException('Course class not found');
    }

    return this.prisma.homework.findMany({
      where: { batchId },
      orderBy: { dueDate: 'desc' },
    });
  }

  /**
   * Checkpoint homework belonging to a course.
   *
   * Cohort homework is found by batch; a checkpoint has no batch at all, so
   * without this it was invisible to every teacher-facing screen — authored,
   * handed in, and impossible to mark.
   */
  async getHomeworkForCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.prisma.homework.findMany({
      where: { moduleItem: { concept: { courseId } } },
      include: {
        moduleItem: {
          select: {
            id: true,
            title: true,
            sortOrder: true,
            concept: { select: { id: true, name: true, sortOrder: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: [
        { moduleItem: { concept: { sortOrder: 'asc' } } },
        { moduleItem: { sortOrder: 'asc' } },
      ],
    });
  }

  /**
   * Who has handed in what, across every checkpoint in a course.
   *
   * The roster is drawn from entitlements rather than batch enrolments. A
   * self-paced learner is never enrolled in a cohort — entitlement is what
   * grants them the course and therefore what makes them someone this teacher
   * is responsible for.
   *
   * Every learner gets a cell on every checkpoint, including the ones they have
   * not touched. Absence is the answer the teacher is looking for, so it has to
   * be present in the data rather than inferred from a gap.
   */
  async getCourseHomeworkProgress(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const entitlements = await this.prisma.entitlement.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { courseId },
          { program: { programCourses: { some: { courseId } } } },
        ],
      },
      select: { studentProfile: { select: { id: true, fullName: true } } },
    });

    // One learner may hold both a course and a programme entitlement.
    const learners = [
      ...new Map(
        entitlements.map((e) => [e.studentProfile.id, e.studentProfile]),
      ).values(),
    ].sort((a, b) => a.fullName.localeCompare(b.fullName));

    const homework = await this.prisma.homework.findMany({
      where: { moduleItem: { concept: { courseId } } },
      select: {
        id: true,
        title: true,
        maxPoints: true,
        dueDate: true,
        moduleItem: {
          select: {
            id: true,
            sortOrder: true,
            concept: { select: { id: true, name: true, sortOrder: true } },
          },
        },
        submissions: {
          select: {
            studentProfileId: true,
            status: true,
            pointsEarned: true,
            submissionDate: true,
          },
        },
      },
      orderBy: [
        { moduleItem: { concept: { sortOrder: 'asc' } } },
        { moduleItem: { sortOrder: 'asc' } },
      ],
    });

    return {
      course,
      learners,
      checkpoints: homework.map((hw) => {
        const byStudent = new Map(
          hw.submissions.map((s) => [s.studentProfileId, s]),
        );
        return {
          homeworkId: hw.id,
          moduleItemId: hw.moduleItem?.id ?? null,
          title: hw.title,
          maxPoints: hw.maxPoints,
          dueDate: hw.dueDate,
          chapter: hw.moduleItem?.concept.name ?? null,
          cells: learners.map((learner) => {
            const submission = byStudent.get(learner.id);
            return {
              studentProfileId: learner.id,
              // NOT_STARTED is a real state here, not a missing row.
              status: submission?.status ?? 'NOT_STARTED',
              pointsEarned: submission?.pointsEarned ?? null,
              submittedAt: submission?.submissionDate ?? null,
            };
          }),
        };
      }),
    };
  }

  // ─── Submissions Operations ──────────────────────────────────────────────────

  /**
   * Hands work in on behalf of `studentProfileId`.
   *
   * `actor` is who is actually doing it, and is usually not the learner: a
   * child created through the family portal has no password and cannot sign
   * in, so their guardian submits for them.
   */
  async submitHomework(
    studentProfileId: string,
    dto: SubmitHomeworkDto,
    actor: { userId: string; roles: string[] },
  ) {
    const fileIds = dto.attachmentFileIds ?? [];
    if (!dto.content && fileIds.length === 0) {
      throw new BadRequestException(
        'Submission must contain either text content or at least one attachment file',
      );
    }
    if (fileIds.length > MAX_ATTACHMENTS_PER_SUBMISSION) {
      throw new BadRequestException(
        `Attach at most ${MAX_ATTACHMENTS_PER_SUBMISSION} files.`,
      );
    }

    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homeworkId },
    });
    if (!homework) {
      throw new NotFoundException('Homework assignment not found');
    }

    if (homework.moduleItemId) {
      // Course checkpoint: reachability is decided by entitlement to the
      // course, the same check the player uses to let them open the item at
      // all. Passing the learner as the acting student means a guardian is
      // judged on the child's access, not their own.
      const allowed = await this.entitlements.canAccessModuleItem(
        actor.userId,
        actor.roles,
        homework.moduleItemId,
        studentProfileId,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'This course is not available to this learner',
        );
      }
    } else {
      // Cohort homework: membership of the batch is what grants access.
      const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
        where: {
          studentProfileId_batchId: {
            studentProfileId,
            batchId: homework.batchId!,
          },
        },
      });
      if (!enrollment) {
        throw new BadRequestException(
          'Student is not enrolled in the course class for this homework',
        );
      }
    }

    const now = new Date();
    // No deadline on a self-paced checkpoint, so nothing can be late.
    const isLate = homework.dueDate ? now > homework.dueDate : false;
    const initialStatus = isLate
      ? SubmissionStatus.LATE
      : SubmissionStatus.SUBMITTED;

    // Each file must be one this caller uploaded and has not already attached
    // elsewhere. Without this check a submission could name any file id and
    // pull another child's work into its own record.
    if (fileIds.length > 0) {
      const owned = await this.prisma.fileUpload.findMany({
        where: { id: { in: fileIds }, userId: actor.userId, isPrivate: true },
        select: { id: true, homeworkAttachment: { select: { id: true } } },
      });
      if (owned.length !== fileIds.length) {
        throw new BadRequestException(
          'One of those files is not available to attach. Upload it again.',
        );
      }
      if (owned.find((f) => f.homeworkAttachment)) {
        throw new BadRequestException(
          'One of those files is already attached to a submission.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.homeworkSubmission.upsert({
        where: {
          homeworkId_studentProfileId: {
            homeworkId: dto.homeworkId,
            studentProfileId,
          },
        },
        update: {
          content: dto.content ?? null,
          submissionDate: now,
          // Re-recorded on resubmission: the second upload may come from
          // someone other than the first, and the latest is the one marked.
          submittedByUserId: actor.userId,
          status: initialStatus,
          // Reset grade fields if resubmitted
          pointsEarned: null,
          feedback: null,
          gradedById: null,
          gradedAt: null,
        },
        create: {
          homeworkId: dto.homeworkId,
          studentProfileId,
          submittedByUserId: actor.userId,
          content: dto.content ?? null,
          submissionDate: now,
          status: initialStatus,
        },
      });

      // A resubmission replaces the previous files rather than adding to them:
      // what is marked should be what was last handed in.
      await tx.homeworkSubmissionAttachment.deleteMany({
        where: { submissionId: submission.id, fileUploadId: { notIn: fileIds } },
      });
      for (const [index, fileUploadId] of fileIds.entries()) {
        await tx.homeworkSubmissionAttachment.upsert({
          where: { fileUploadId },
          update: { submissionId: submission.id, sortOrder: index },
          create: { submissionId: submission.id, fileUploadId, sortOrder: index },
        });
      }

      // Handing in *is* completing the checkpoint, so the outline should say
      // so without the learner also having to tick it.
      if (homework.moduleItemId) {
        await tx.moduleItemProgress.upsert({
          where: {
            moduleItemId_studentProfileId: {
              moduleItemId: homework.moduleItemId,
              studentProfileId,
            },
          },
          update: { completedAt: now },
          create: {
            moduleItemId: homework.moduleItemId,
            studentProfileId,
            completedAt: now,
          },
        });
      }

      return tx.homeworkSubmission.findUniqueOrThrow({
        where: { id: submission.id },
        include: {
          attachments: {
            orderBy: { sortOrder: 'asc' },
            select: {
              fileUploadId: true,
              sortOrder: true,
              file: { select: { originalName: true, size: true, mimetype: true } },
            },
          },
        },
      });
    });
  }

  async gradeSubmission(
    submissionId: string,
    dto: GradeSubmissionDto,
    gradedByUserId?: string,
  ) {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: { homework: true },
    });
    if (!submission) {
      throw new NotFoundException('Homework submission not found');
    }

    if (dto.pointsEarned > submission.homework.maxPoints) {
      throw new BadRequestException(
        `Points earned (${dto.pointsEarned}) cannot exceed max points for homework (${submission.homework.maxPoints})`,
      );
    }

    const gradedAt = new Date();
    const updated = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        pointsEarned: dto.pointsEarned,
        feedback: dto.feedback ?? undefined,
        status: SubmissionStatus.GRADED,
        gradedById: gradedByUserId,
        gradedAt,
      },
    });

    await this.gradebookService.upsertFromHomeworkSubmission(
      submissionId,
      dto.pointsEarned,
      submission.homework.maxPoints,
      gradedAt,
    );

    return updated;
  }

  async getSubmissionsForHomework(homeworkId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
    });
    if (!homework) {
      throw new NotFoundException('Homework assignment not found');
    }

    return this.prisma.homeworkSubmission.findMany({
      where: { homeworkId },
      include: {
        studentProfile: true,
        // Without these the marker cannot open the work they are marking.
        attachments: {
          orderBy: { sortOrder: 'asc' },
          select: {
            fileUploadId: true,
            sortOrder: true,
            file: { select: { originalName: true, size: true, mimetype: true } },
          },
        },
        // Whose hands typed it, when that is not the learner.
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: {
        submissionDate: 'desc',
      },
    });
  }

  async getStudentSubmissions(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.prisma.homeworkSubmission.findMany({
      where: { studentProfileId },
      include: {
        homework: {
          include: {
            batch: true,
          },
        },
      },
      orderBy: {
        submissionDate: 'desc',
      },
    });
  }

  async getStudentPendingHomework(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        enrollments: true,
      },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const enrolledBatchIds = student.enrollments.map(
      (e) => e.batchId,
    );
    if (enrolledBatchIds.length === 0) {
      return [];
    }

    const allHomework = await this.prisma.homework.findMany({
      where: {
        batchId: { in: enrolledBatchIds },
      },
      include: {
        batch: true,
        submissions: {
          where: { studentProfileId },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return allHomework.filter((h) => h.submissions.length === 0);
  }
}
