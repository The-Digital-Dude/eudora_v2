import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DeliveryMode, EnrollmentStatus, ModuleItemKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateModuleItemDto,
  UpdateModuleItemDto,
  UpdateModuleItemProgressDto,
  CreateDiscussionPostDto,
} from './dto/module-item.dto';
import { ProgressionService } from '../progression/progression.service';
import { ActingStudentService } from '../entitlements/acting-student.service';

@Injectable()
export class ModuleItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
    private readonly actingStudent: ActingStudentService,
  ) {}

  async createModuleItem(dto: CreateModuleItemDto) {
    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
    });
    if (!concept) {
      throw new NotFoundException('Concept not found');
    }
    if (dto.kind === 'LIVE_CLASS' && !concept.courseId) {
      // A live class is met by a batch, and a batch is a cohort of a course.
      // An item floating outside any course has nothing to schedule against.
      throw new BadRequestException(
        'A LIVE_CLASS item must belong to a concept attached to a course',
      );
    }
    if (dto.kind === 'ASSESSMENT') {
      if (!dto.assessmentId) {
        throw new BadRequestException(
          'assessmentId is required for an ASSESSMENT item',
        );
      }
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: dto.assessmentId },
      });
      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }
    }

    if (dto.kind === 'HOMEWORK' && (dto.homeworkMaxPoints ?? 0) <= 0) {
      throw new BadRequestException(
        'homeworkMaxPoints is required for a HOMEWORK item',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.moduleItem.create({
        data: {
          conceptId: dto.conceptId,
          kind: dto.kind,
          title: dto.title,
          sortOrder: dto.sortOrder ?? 1,
          status: dto.status ?? 'DRAFT',
          videoUrl: dto.videoUrl || null,
          videoDurationSeconds: dto.videoDurationSeconds ?? null,
          readingContent: dto.readingContent || null,
          assessmentId: dto.kind === 'ASSESSMENT' ? dto.assessmentId : null,
        },
      });

      if (dto.kind === 'DISCUSSION') {
        await tx.discussionThread.create({
          data: {
            moduleItemId: item.id,
            prompt: dto.discussionPrompt || dto.title,
          },
        });
      }

      // Same shape as the discussion thread above: the item is the slot in the
      // chapter, and the row created here is what the slot actually contains.
      // No batchId — that is the whole point of a checkpoint, and the
      // `homeworks_one_parent` constraint enforces the either/or.
      if (dto.kind === 'HOMEWORK') {
        await tx.homework.create({
          data: {
            moduleItemId: item.id,
            title: dto.title,
            description: dto.homeworkInstructions || null,
            maxPoints: dto.homeworkMaxPoints!,
            dueDate: dto.homeworkDueDate ? new Date(dto.homeworkDueDate) : null,
          },
        });
      }

      // A course carrying a live item is LIVE-only: a self-paced buyer has no
      // batch, so the item would have no meeting to resolve to. Adding one
      // therefore moves the course rather than failing — the inverse guard
      // (blocking LIVE -> SELF_PACED) lives in CoursesService.
      if (dto.kind === 'LIVE_CLASS') {
        await tx.course.update({
          where: { id: concept.courseId! },
          data: { deliveryMode: DeliveryMode.LIVE },
        });
      }

      return tx.moduleItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { discussion: true, homework: true },
      });
    });
  }

  async updateModuleItem(id: string, dto: UpdateModuleItemDto) {
    const item = await this.prisma.moduleItem.findUnique({ where: { id } });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }
    return this.prisma.moduleItem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.videoDurationSeconds !== undefined
          ? { videoDurationSeconds: dto.videoDurationSeconds }
          : {}),
        ...(dto.readingContent !== undefined
          ? { readingContent: dto.readingContent }
          : {}),
        ...(dto.assessmentId !== undefined
          ? { assessmentId: dto.assessmentId }
          : {}),
      },
    });
  }

  async deleteModuleItem(id: string) {
    const item = await this.prisma.moduleItem.findUnique({ where: { id } });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }
    return this.prisma.moduleItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertProgress(
    moduleItemId: string,
    userId: string,
    dto: UpdateModuleItemProgressDto,
    actingStudentId?: string | null,
  ) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
    });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }

    // The lock is computed for the course-detail response, but until this call
    // existed nothing re-checked it at the point of writing — so a client that
    // skipped ahead (or any direct API call) could mark locked content done.
    await this.progression.assertConceptUnlocked(userId, item.conceptId);

    // Resolved the same way getLiveSession below already does it. Using
    // resolveStudentProfileId here meant a guardian could never mark anything
    // complete — they have no student profile of their own — and the child
    // they are working for has no password to sign in with, so nothing in a
    // course could be ticked off for a family-portal learner at all.
    const studentProfileId = await this.actingStudent.resolve(
      userId,
      actingStudentId ?? null,
    );
    if (!studentProfileId) {
      throw new BadRequestException(
        'Select which child this progress is for, or sign in as the learner',
      );
    }

    const existing = await this.prisma.moduleItemProgress.findUnique({
      where: {
        moduleItemId_studentProfileId: { moduleItemId, studentProfileId },
      },
    });

    let completedAt = existing?.completedAt ?? null;
    if (dto.completed === true) {
      completedAt = existing?.completedAt ?? new Date();
    } else if (dto.completed === false) {
      completedAt = null;
    }

    return this.prisma.moduleItemProgress.upsert({
      where: {
        moduleItemId_studentProfileId: { moduleItemId, studentProfileId },
      },
      update: {
        completedAt,
        ...(dto.lastPositionSeconds !== undefined
          ? { lastPositionSeconds: dto.lastPositionSeconds }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      create: {
        moduleItemId,
        studentProfileId,
        completedAt,
        lastPositionSeconds: dto.lastPositionSeconds ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  // Resolves the current student's existing AssessmentAssignment for this
  // item's linked Assessment (if any) — the existing assignment-creation
  // workflow (teacher assigns a class section) is unchanged/out of scope
  // here; this just looks up what already exists so the outline can link
  // straight to the existing standalone assessment player.
  async getMyAssignmentForItem(moduleItemId: string, userId: string) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
      select: { assessmentId: true },
    });
    if (!item || !item.assessmentId) {
      throw new NotFoundException('This item is not linked to an assessment');
    }
    const studentProfileId = await this.resolveStudentProfileId(userId);
    if (!studentProfileId) {
      return { assignment: null };
    }
    const assignment = await this.prisma.assessmentAssignment.findFirst({
      where: { assessmentId: item.assessmentId, studentProfileId },
      select: { id: true, status: true, dueAt: true },
    });
    return { assignment: assignment ?? null };
  }

  /**
   * The brief for a HOMEWORK checkpoint, plus whatever this learner has already
   * handed in for it.
   *
   * Resolved through the acting student rather than the caller's own profile:
   * the person opening a course checkpoint is usually the guardian working as
   * the child, since a child created through the family portal has no password.
   */
  async getMyHomeworkForItem(
    moduleItemId: string,
    userId: string,
    actingStudentId?: string | null,
  ) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
      select: {
        homework: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            maxPoints: true,
          },
        },
      },
    });
    if (!item?.homework) {
      throw new NotFoundException('This item has no homework');
    }

    const studentProfileId = await this.actingStudent.resolve(
      userId,
      actingStudentId ?? null,
    );
    if (!studentProfileId) {
      // Staff previewing the course, most likely. They see the brief; there is
      // no submission of their own to show.
      return { homework: item.homework, submission: null };
    }

    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: {
        homeworkId_studentProfileId: {
          homeworkId: item.homework.id,
          studentProfileId,
        },
      },
      select: {
        id: true,
        status: true,
        content: true,
        submissionDate: true,
        pointsEarned: true,
        feedback: true,
        gradedAt: true,
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

    return { homework: item.homework, submission: submission ?? null };
  }

  /**
   * The meeting *this* student attends for a LIVE_CLASS item.
   *
   * The item is shared by every cohort that buys the course, so the session
   * can only be resolved per-student: their `StudentCourseEnrollment` names
   * the batch, and the batch owns the dated `BatchSession`. A student with no
   * enrollment, or a batch that has not scheduled this item yet, gets
   * `{ session: null }` plus a reason the UI can explain.
   */
  async getMySessionForItem(
    moduleItemId: string,
    userId: string,
    actingStudentId?: string | null,
  ) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
      select: { id: true, kind: true, title: true, deletedAt: true },
    });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }
    if (item.kind !== ModuleItemKind.LIVE_CLASS) {
      throw new BadRequestException('This item is not a live class');
    }

    const studentProfileId = await this.actingStudent.resolve(
      userId,
      actingStudentId ?? null,
    );
    if (!studentProfileId) {
      return { session: null, reason: 'NOT_A_STUDENT' as const };
    }

    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: { studentProfileId, status: EnrollmentStatus.ENROLLED },
      select: { batchId: true },
    });
    if (enrollments.length === 0) {
      return { session: null, reason: 'NOT_IN_A_BATCH' as const };
    }

    const session = await this.prisma.batchSession.findFirst({
      where: {
        moduleItemId,
        batchId: { in: enrollments.map((e) => e.batchId) },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        batch: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!session) {
      return { session: null, reason: 'NOT_SCHEDULED' as const };
    }

    // The host URL starts the meeting and must never reach a learner.
    const { startUrl: _startUrl, ...safe } = session;
    return { session: safe, reason: null };
  }

  async getDiscussion(moduleItemId: string) {
    const thread = await this.prisma.discussionThread.findUnique({
      where: { moduleItemId },
      include: {
        posts: {
          orderBy: { createdAt: 'asc' },
          include: {
            studentProfile: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    if (!thread) {
      throw new NotFoundException('Discussion thread not found');
    }
    return thread;
  }

  async addDiscussionPost(
    moduleItemId: string,
    userId: string,
    dto: CreateDiscussionPostDto,
  ) {
    const thread = await this.prisma.discussionThread.findUnique({
      where: { moduleItemId },
    });
    if (!thread) {
      throw new NotFoundException('Discussion thread not found');
    }
    const studentProfileId = await this.resolveStudentProfileId(userId);
    if (!studentProfileId) {
      throw new BadRequestException('Only students can post to a discussion');
    }
    return this.prisma.discussionPost.create({
      data: {
        discussionThreadId: thread.id,
        studentProfileId,
        parentPostId: dto.parentPostId || null,
        body: dto.body,
      },
      include: {
        studentProfile: { select: { id: true, fullName: true } },
      },
    });
  }

  private async resolveStudentProfileId(
    userId: string,
  ): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }
}
