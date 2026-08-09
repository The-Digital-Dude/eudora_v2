import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import {
  ListResponsesQueryDto,
  MarkStudentResponseDto,
  SaveStudentResponseDto,
  UpdateStudentResponseDto,
} from './dto/assessments.dto';
import {
  autoMarkResponse,
  emptyToNull,
  idFilter,
  normalizePagination,
  nullableNonNegativeInteger,
  nullableNonNegativeNumber,
  requireRecord,
  responseSelect,
  toPage,
  audit,
} from './assessments.common';
import { deriveSeed } from '../common/widgets/seed.util';

@Injectable()
export class StudentResponsesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  /**
   * Ownership check for a given attempt — a student may only touch responses
   * belonging to their own attempt; staff/guardian access rules are handled
   * by `assertCanAccessStudentRecord` (same pattern as AttemptsService).
   */
  async assertCanAccessAttempt(
    assessmentAttemptId: string,
    user: CurrentUserDto,
  ): Promise<void> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: assessmentAttemptId },
      select: { studentProfileId: true },
    });
    const resolved = requireRecord(attempt, 'Attempt not found');
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      resolved.studentProfileId,
    );
  }

  async listResponses(query: ListResponsesQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...idFilter('assessmentAttemptId', query.assessmentAttemptId),
      ...idFilter('questionId', query.questionId),
    };
    const [items, total] = await Promise.all([
      this.prisma.studentResponse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
        select: responseSelect,
      }),
      this.prisma.studentResponse.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async getResponse(id: string, user: CurrentUserDto) {
    const response = await this.prisma.studentResponse.findUnique({
      where: { id },
      select: responseSelect,
    });
    const resolved = requireRecord(response, 'Response not found');
    await this.assertCanAccessAttempt(resolved.assessmentAttemptId, user);
    return resolved;
  }

  async saveResponse(input: SaveStudentResponseDto, user: CurrentUserDto) {
    const actorUserId = user.id;
    await this.assertCanAccessAttempt(input.assessmentAttemptId, user);
    const context = await this.resolveResponseContext(
      input.assessmentAttemptId,
      input.questionId,
      input.selectedOptionId,
    );
    const autoMark = autoMarkResponse(
      context.question as any,
      input.selectedOptionId,
      input.responseText,
      input.interactionState,
      context.marksAvailable,
      deriveSeed(input.assessmentAttemptId, input.questionId),
    );
    const response = await this.prisma.studentResponse.upsert({
      where: {
        assessmentAttemptId_questionId: {
          assessmentAttemptId: input.assessmentAttemptId,
          questionId: input.questionId,
        },
      },
      create: {
        assessmentAttemptId: input.assessmentAttemptId,
        questionId: input.questionId,
        selectedOptionId: emptyToNull(input.selectedOptionId),
        responseText: emptyToNull(input.responseText),
        interactionState: input.interactionState ?? null,
        marksAvailable: context.marksAvailable,
        timeSpentSeconds:
          nullableNonNegativeInteger(
            input.timeSpentSeconds,
            'timeSpentSeconds',
          ) ?? 0,
        ...autoMark,
      } as any,
      update: {
        selectedOptionId: emptyToNull(input.selectedOptionId),
        responseText: emptyToNull(input.responseText),
        interactionState:
          input.interactionState !== undefined
            ? (input.interactionState ?? null)
            : undefined,
        timeSpentSeconds: nullableNonNegativeInteger(
          input.timeSpentSeconds,
          'timeSpentSeconds',
        ),
        marksAvailable: context.marksAvailable,
        ...autoMark,
      } as any,
      select: responseSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.response.saved',
      'studentResponse',
      response.id,
    );
    return response;
  }

  async updateResponse(
    id: string,
    input: UpdateStudentResponseDto,
    user: CurrentUserDto,
  ) {
    const actorUserId = user.id;
    const existing = await this.prisma.studentResponse.findUnique({
      where: { id },
      select: { assessmentAttemptId: true, questionId: true },
    });
    const resolved = requireRecord(existing, 'Response not found');
    await this.assertCanAccessAttempt(resolved.assessmentAttemptId, user);
    if (input.selectedOptionId !== undefined) {
      await this.resolveResponseContext(
        resolved.assessmentAttemptId,
        resolved.questionId,
        input.selectedOptionId,
      );
    }
    const response = await this.prisma.studentResponse.update({
      where: { id },
      data: {
        ...(input.selectedOptionId !== undefined
          ? { selectedOptionId: emptyToNull(input.selectedOptionId) }
          : {}),
        ...(input.responseText !== undefined
          ? { responseText: emptyToNull(input.responseText) }
          : {}),
        ...(input.timeSpentSeconds !== undefined
          ? {
              timeSpentSeconds: nullableNonNegativeInteger(
                input.timeSpentSeconds,
                'timeSpentSeconds',
              ),
            }
          : {}),
        ...(input.feedback !== undefined
          ? { feedback: emptyToNull(input.feedback) }
          : {}),
      } as any,
      select: responseSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.response.updated',
      'studentResponse',
      response.id,
    );
    return response;
  }

  async markResponse(
    id: string,
    input: MarkStudentResponseDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.studentResponse.findUnique({
      where: { id },
      select: { marksAvailable: true, assessmentAttemptId: true },
    });
    const resolved = requireRecord(existing, 'Response not found');
    const marksAwarded =
      input.marksAwarded === undefined
        ? undefined
        : nullableNonNegativeNumber(input.marksAwarded, 'marksAwarded');
    if (
      marksAwarded !== null &&
      marksAwarded !== undefined &&
      marksAwarded > resolved.marksAvailable
    ) {
      throw new BadRequestException(
        'marksAwarded cannot exceed marksAvailable',
      );
    }
    const response = await this.prisma.studentResponse.update({
      where: { id },
      data: {
        ...(input.isCorrect !== undefined
          ? { isCorrect: input.isCorrect }
          : {}),
        ...(marksAwarded !== undefined ? { marksAwarded } : {}),
        ...(input.feedback !== undefined
          ? { feedback: emptyToNull(input.feedback) }
          : {}),
      } as any,
      select: responseSelect,
    });
    await this.recalculateAttempt(resolved.assessmentAttemptId, {
      resultStatus: 'needs_review',
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.response.marked',
      'studentResponse',
      response.id,
    );
    return response;
  }

  private async resolveResponseContext(
    assessmentAttemptId: string,
    questionId: string,
    selectedOptionId?: string | null,
  ) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: assessmentAttemptId },
      select: {
        id: true,
        assignment: {
          select: {
            assessmentId: true,
            assessment: {
              select: {
                questions: {
                  where: { questionId },
                  select: { marksAvailable: true },
                },
              },
            },
          },
        },
      },
    });
    const resolvedAttempt = requireRecord(attempt, 'Attempt not found');
    const assessmentQuestion =
      resolvedAttempt.assignment.assessment.questions[0];
    if (!assessmentQuestion) {
      throw new BadRequestException(
        'questionId is not part of this assessment',
      );
    }
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        questionType: true,
        correctAnswer: true,
        widgetType: true,
        widgetConfig: true,
        options: { select: { id: true, isCorrect: true } },
      },
    });
    const resolvedQuestion = requireRecord(question, 'Question not found');
    const resolvedOptionId = emptyToNull(selectedOptionId);
    if (
      resolvedOptionId &&
      !resolvedQuestion.options.some((option) => option.id === resolvedOptionId)
    ) {
      throw new BadRequestException(
        'selectedOptionId does not belong to questionId',
      );
    }
    return {
      marksAvailable: assessmentQuestion.marksAvailable,
      question: resolvedQuestion,
    };
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
      select: {
        id: true,
      },
    });
  }
}
