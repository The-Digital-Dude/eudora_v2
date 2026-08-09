import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GradebookService } from '../gradebook/gradebook.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import {
  CreateAttemptDto,
  ListAttemptsQueryDto,
  MarkAttemptDto,
  UpdateAttemptDto,
} from './dto/assessments.dto';
import {
  attemptQuestionsSelect,
  attemptSelect,
  autoMarkResponse,
  emptyToNull,
  enumFilter,
  enumValue,
  idFilter,
  normalizePagination,
  nullableNonNegativeInteger,
  nullableNonNegativeNumber,
  nullablePositiveNumber,
  requireRecord,
  requireText,
  toPage,
  toStudentSafeAttemptQuestions,
  audit,
} from './assessments.common';
import { deriveSeed } from '../common/widgets/seed.util';

const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradebookService: GradebookService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  /**
   * Student-safe question list for an in-progress attempt — ownership-
   * checked (staff may preview any attempt; a student may only read their
   * own), with each question's widget instance regenerated from the same
   * seed `submitResponse`/`autoMarkResponse` will grade against.
   */
  async getAttemptQuestions(
    id: string,
    userId: string,
    roles: string[],
  ) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id },
      select: {
        id: true,
        studentProfileId: true,
        assignment: { select: { assessmentId: true } },
      },
    });
    requireRecord(attempt, 'Attempt not found');

    const isStaff = roles.some((r) => STAFF_ROLES.has(r));
    if (!isStaff) {
      const student = await this.prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!student || student.id !== attempt!.studentProfileId) {
        throw new ForbiddenException("You don't have access to this attempt");
      }
    }

    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { assessmentId: attempt!.assignment.assessmentId },
      orderBy: [{ section: { sortOrder: 'asc' } }, { questionNumber: 'asc' }],
      select: attemptQuestionsSelect,
    });

    return toStudentSafeAttemptQuestions(questions, id);
  }

  async listAttempts(query: ListAttemptsQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...idFilter('assessmentAssignmentId', query.assessmentAssignmentId),
      ...idFilter('studentProfileId', query.studentProfileId),
      ...enumFilter('resultStatus', query.resultStatus, [
        'in_progress',
        'submitted',
        'marked',
        'needs_review',
      ]),
    };
    const [items, total] = await Promise.all([
      this.prisma.assessmentAttempt.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
        select: attemptSelect,
      }),
      this.prisma.assessmentAttempt.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async getAttempt(id: string, user: CurrentUserDto) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id },
      select: attemptSelect,
    });
    const resolved = requireRecord(attempt, 'Attempt not found');
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      resolved.studentProfileId,
    );
    return resolved;
  }

  async startAttempt(input: CreateAttemptDto, actorUserId: string) {
    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: {
        id: requireText(input.assessmentAssignmentId, 'assessmentAssignmentId'),
      },
      select: {
        id: true,
        studentProfileId: true,
        classSectionId: true,
        status: true,
        assessment: { select: { maxAttempts: true } },
      },
    });
    const resolvedAssignment = requireRecord(
      assignment,
      'Assignment not found',
    );
    if (
      resolvedAssignment.status === 'cancelled' ||
      resolvedAssignment.status === 'exempted'
    ) {
      throw new ConflictException(
        'Cannot start an attempt for a cancelled or exempted assignment',
      );
    }

    const studentProfileId =
      resolvedAssignment.studentProfileId ??
      requireText(input.studentProfileId, 'studentProfileId');
    if (
      resolvedAssignment.studentProfileId &&
      input.studentProfileId &&
      input.studentProfileId !== resolvedAssignment.studentProfileId
    ) {
      throw new BadRequestException(
        'studentProfileId does not match the assignment',
      );
    }
    if (resolvedAssignment.classSectionId) {
      await this.assertStudentBelongsToClass(
        studentProfileId,
        resolvedAssignment.classSectionId,
      );
    }

    const attempt = await this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.assessmentAttempt.count({
        where: { assessmentAssignmentId: resolvedAssignment.id },
      });
      const maxAttempts = resolvedAssignment.assessment?.maxAttempts;
      if (maxAttempts != null && existingCount >= maxAttempts) {
        throw new ConflictException(
          `Maximum of ${maxAttempts} attempt(s) already used for this assessment`,
        );
      }
      await tx.assessmentAttempt.updateMany({
        where: {
          assessmentAssignmentId: resolvedAssignment.id,
          isLatest: true,
        },
        data: { isLatest: false },
      });
      await tx.assessmentAssignment.update({
        where: { id: resolvedAssignment.id },
        data: { status: 'started' },
        select: { id: true },
      });
      return tx.assessmentAttempt.create({
        data: {
          assessmentAssignmentId: resolvedAssignment.id,
          studentProfileId,
          attemptNumber: existingCount + 1,
          ...(input.rawImportPayload !== undefined
            ? { rawImportPayload: input.rawImportPayload }
            : {}),
        } as any,
        select: attemptSelect,
      });
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.attempt.started',
      'assessmentAttempt',
      attempt.id,
    );
    return attempt;
  }

  async updateAttempt(
    id: string,
    input: UpdateAttemptDto,
    user: CurrentUserDto,
  ) {
    const actorUserId = user.id;
    const existing = await this.prisma.assessmentAttempt.findUnique({
      where: { id },
      select: { studentProfileId: true },
    });
    const resolvedExisting = requireRecord(existing, 'Attempt not found');
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      resolvedExisting.studentProfileId,
    );
    const maxScore =
      input.maxScore === undefined
        ? undefined
        : nullablePositiveNumber(input.maxScore, 'maxScore');
    const rawScore =
      input.rawScore === undefined
        ? undefined
        : nullableNonNegativeNumber(input.rawScore, 'rawScore');
    const attempt = await this.prisma.assessmentAttempt.update({
      where: { id },
      data: {
        ...(input.timeSpentSeconds !== undefined
          ? {
              timeSpentSeconds: nullableNonNegativeInteger(
                input.timeSpentSeconds,
                'timeSpentSeconds',
              ),
            }
          : {}),
        ...(rawScore !== undefined ? { rawScore } : {}),
        ...(maxScore !== undefined ? { maxScore } : {}),
        ...(input.percentageScore !== undefined
          ? {
              percentageScore: nullableNonNegativeNumber(
                input.percentageScore,
                'percentageScore',
              ),
            }
          : {}),
        ...(input.resultStatus !== undefined
          ? {
              resultStatus: enumValue(
                input.resultStatus,
                ['in_progress', 'submitted', 'marked', 'needs_review'],
                'resultStatus',
              ),
            }
          : {}),
        ...(input.teacherComment !== undefined
          ? { teacherComment: emptyToNull(input.teacherComment) }
          : {}),
        ...(input.parentComment !== undefined
          ? { parentComment: emptyToNull(input.parentComment) }
          : {}),
        ...(input.rawImportPayload !== undefined
          ? { rawImportPayload: input.rawImportPayload }
          : {}),
      } as any,
      select: attemptSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.attempt.updated',
      'assessmentAttempt',
      attempt.id,
    );
    return attempt;
  }

  async submitAttempt(id: string, user: CurrentUserDto) {
    const actorUserId = user.id;
    const existing = await this.prisma.assessmentAttempt.findUnique({
      where: { id },
      select: { studentProfileId: true },
    });
    const resolvedExisting = requireRecord(existing, 'Attempt not found');
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      resolvedExisting.studentProfileId,
    );
    const attempt = await this.recalculateAttempt(id, {
      resultStatus: 'submitted',
      submittedAt: new Date(),
    });
    await this.prisma.assessmentAssignment.update({
      where: { id: attempt.assessmentAssignmentId },
      data: { status: 'submitted' },
      select: { id: true },
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.attempt.submitted',
      'assessmentAttempt',
      attempt.id,
    );
    return attempt;
  }

  async markAttempt(id: string, input: MarkAttemptDto, actorUserId: string) {
    if ((input.mode ?? 'manual') === 'auto') {
      await this.autoMarkAttemptResponses(id);
    }
    const attempt = await this.recalculateAttempt(id, {
      resultStatus: 'marked',
      markedByUserId: actorUserId,
      ...(input.teacherComment !== undefined
        ? { teacherComment: emptyToNull(input.teacherComment) }
        : {}),
      ...(input.parentComment !== undefined
        ? { parentComment: emptyToNull(input.parentComment) }
        : {}),
    });
    await this.updateBestAttempt(attempt.assessmentAssignmentId);

    // Sync to Gradebook
    await this.gradebookService.upsertFromAssessmentAttempt(
      attempt.id,
      attempt.rawScore ?? 0,
      attempt.maxScore ?? 0,
      attempt.updatedAt,
    );

    await audit(
      this.prisma,
      actorUserId,
      'assessments.attempt.marked',
      'assessmentAttempt',
      attempt.id,
    );
    return attempt;
  }

  private async assertStudentBelongsToClass(
    studentProfileId: string,
    classSectionId: string,
  ): Promise<void> {
    const placement = await this.prisma.studentClassPlacement.findFirst({
      where: { studentProfileId, classSectionId, isActive: true },
      select: { studentProfileId: true },
    });
    if (!placement) {
      throw new BadRequestException(
        'Student is not actively placed in this class section',
      );
    }
  }

  private async autoMarkAttemptResponses(
    assessmentAttemptId: string,
  ): Promise<void> {
    const responses = await this.prisma.studentResponse.findMany({
      where: { assessmentAttemptId },
      select: {
        id: true,
        questionId: true,
        selectedOptionId: true,
        responseText: true,
        interactionState: true,
        marksAvailable: true,
        question: {
          select: {
            questionType: true,
            correctAnswer: true,
            widgetType: true,
            widgetConfig: true,
            options: { select: { id: true, isCorrect: true } },
          },
        },
      },
    });
    await Promise.all(
      responses.map((response) => {
        const marked = autoMarkResponse(
          response.question as any,
          response.selectedOptionId,
          response.responseText,
          response.interactionState as any,
          response.marksAvailable,
          deriveSeed(assessmentAttemptId, response.questionId),
        );
        if (marked.isCorrect === undefined) {
          return Promise.resolve();
        }
        return this.prisma.studentResponse.update({
          where: { id: response.id },
          data: marked,
          select: { id: true },
        });
      }),
    );
  }

  private async recalculateAttempt(
    assessmentAttemptId: string,
    overrides: {
      resultStatus?: string;
      submittedAt?: Date;
      markedByUserId?: string;
      teacherComment?: string | null;
      parentComment?: string | null;
    } = {},
  ) {
    const responses = await this.prisma.studentResponse.findMany({
      where: { assessmentAttemptId },
      select: { marksAwarded: true, marksAvailable: true },
    });
    const rawScore = responses.reduce(
      (sum, response) => sum + (response.marksAwarded ?? 0),
      0,
    );
    const maxScore = responses.reduce(
      (sum, response) => sum + response.marksAvailable,
      0,
    );
    const percentageScore = maxScore > 0 ? (rawScore / maxScore) * 100 : null;

    return this.prisma.assessmentAttempt.update({
      where: { id: assessmentAttemptId },
      data: {
        rawScore,
        maxScore,
        percentageScore,
        ...(overrides.resultStatus
          ? { resultStatus: overrides.resultStatus }
          : {}),
        ...(overrides.submittedAt
          ? { submittedAt: overrides.submittedAt }
          : {}),
        ...(overrides.markedByUserId
          ? { markedByUserId: overrides.markedByUserId }
          : {}),
        ...(overrides.teacherComment !== undefined
          ? { teacherComment: overrides.teacherComment }
          : {}),
        ...(overrides.parentComment !== undefined
          ? { parentComment: overrides.parentComment }
          : {}),
      } as any,
      select: attemptSelect,
    });
  }

  private async updateBestAttempt(
    assessmentAssignmentId: string,
  ): Promise<void> {
    const bestAttempt = await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentAssignmentId, rawScore: { not: null } },
      orderBy: [{ rawScore: 'desc' }, { submittedAt: 'asc' }],
      select: { id: true },
    });
    await this.prisma.assessmentAttempt.updateMany({
      where: { assessmentAssignmentId },
      data: { isBest: false },
    });
    if (bestAttempt) {
      await this.prisma.assessmentAttempt.update({
        where: { id: bestAttempt.id },
        data: { isBest: true },
        select: { id: true },
      });
    }
  }
}
