import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const lookupSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const levelSelect = {
  ...lookupSelect,
  sortOrder: true,
};

export const assessmentSelect = {
  id: true,
  assessmentTypeId: true,
  subjectId: true,
  levelId: true,
  termId: true,
  weekNumber: true,
  title: true,
  totalMarks: true,
  estimatedDurationMinutes: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  assessmentType: { select: { id: true, code: true, name: true } },
  subject: { select: { id: true, code: true, name: true } },
  level: { select: { id: true, code: true, name: true } },
  term: { select: { id: true, name: true } },
  sections: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, title: true, sortOrder: true },
  },
  questions: {
    orderBy: { questionNumber: 'asc' as const },
    select: {
      id: true,
      questionId: true,
      questionNumber: true,
      marksAvailable: true,
      sectionId: true,
      question: {
        select: {
          id: true,
          questionType: true,
          prompt: true,
          difficulty: true,
          status: true,
          widgetType: true,
          widgetConfig: true,
          correctAnswer: true,
          explanation: true,
          hints: true,
          options: {
            orderBy: { optionLabel: 'asc' as const },
            select: {
              id: true,
              optionLabel: true,
              optionText: true,
              isCorrect: true,
            },
          },
        },
      },
    },
  },
};

export const questionSelect = {
  id: true,
  subjectId: true,
  levelId: true,
  questionType: true,
  prompt: true,
  correctAnswer: true,
  difficulty: true,
  status: true,
  widgetType: true,
  widgetConfig: true,
  explanation: true,
  hints: true,
  createdAt: true,
  updatedAt: true,
  options: {
    orderBy: { optionLabel: 'asc' as const },
    select: {
      id: true,
      questionId: true,
      optionLabel: true,
      optionText: true,
      isCorrect: true,
    },
  },
};

export const assignmentSelect = {
  id: true,
  assessmentId: true,
  studentProfileId: true,
  classSectionId: true,
  lessonId: true,
  assignedByUserId: true,
  opensAt: true,
  dueAt: true,
  status: true,
  reminderCount: true,
  createdAt: true,
  updatedAt: true,
  assessment: {
    select: { id: true, title: true, status: true, totalMarks: true },
  },
  studentProfile: { select: { id: true, fullName: true } },
  classSection: { select: { id: true, code: true, name: true } },
};

export const attemptSelect = {
  id: true,
  assessmentAssignmentId: true,
  studentProfileId: true,
  attemptNumber: true,
  startedAt: true,
  submittedAt: true,
  timeSpentSeconds: true,
  rawScore: true,
  maxScore: true,
  percentageScore: true,
  resultStatus: true,
  isLatest: true,
  isBest: true,
  markedByUserId: true,
  teacherComment: true,
  parentComment: true,
  rawImportPayload: true,
  createdAt: true,
  updatedAt: true,
  responses: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      questionId: true,
      selectedOptionId: true,
      responseText: true,
      interactionState: true,
      isCorrect: true,
      marksAwarded: true,
      marksAvailable: true,
      timeSpentSeconds: true,
      feedback: true,
    },
  },
};

export const responseSelect = {
  id: true,
  assessmentAttemptId: true,
  questionId: true,
  selectedOptionId: true,
  responseText: true,
  interactionState: true,
  isCorrect: true,
  marksAwarded: true,
  marksAvailable: true,
  timeSpentSeconds: true,
  feedback: true,
  createdAt: true,
  updatedAt: true,
  question: {
    select: { id: true, questionType: true, prompt: true, difficulty: true },
  },
  selectedOption: { select: { id: true, optionLabel: true, optionText: true } },
};

export function normalizePagination(query: {
  page?: string | number;
  pageSize?: string | number;
}): { page: number; pageSize: number; skip: number } {
  const page = clampNumber(query.page, 1, 1, 100_000);
  const pageSize = clampNumber(query.pageSize, 25, 1, 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function toPage<T>(
  items: T[],
  total: number,
  pagination: { page: number; pageSize: number },
) {
  return { items, total, page: pagination.page, pageSize: pagination.pageSize };
}

export function searchFilter(
  search: string | undefined,
  fields: string[],
): object {
  const value = search?.trim();
  if (!value) {
    return {};
  }
  return {
    OR: fields.map((field) => ({
      [field]: { contains: value, mode: 'insensitive' },
    })),
  };
}

export function idFilter(field: string, value: string | undefined): object {
  const id = value?.trim();
  return id ? { [field]: id } : {};
}

export function numberFilter(
  field: string,
  value: string | number | undefined,
): object {
  if (value === undefined || value === '') {
    return {};
  }
  return { [field]: clampNumber(value, 0, 0, 10_000) };
}

export function enumFilter(
  field: string,
  value: string | undefined,
  allowed: string[],
): object {
  return value ? { [field]: enumValue(value, allowed, field) } : {};
}

export function enumValue<T extends string>(
  value: string,
  allowed: T[],
  field: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(
      `${field} must be one of: ${allowed.join(', ')}`,
    );
  }
  return value as T;
}

export function clampNumber(
  value: string | number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const numericValue =
    typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numericValue));
}

export function normalizeCode(value: string): string {
  return requireText(value, 'code').toLowerCase();
}

export function requireText(
  value: string | undefined | null,
  field: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new BadRequestException(`${field} is required`);
  }
  return trimmed;
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseOptionalDate(
  value: string | null | undefined,
  field: string,
): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return date;
}

export function assertPositiveNumber(
  value: number | null | undefined,
  field: string,
): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`${field} must be greater than 0`);
  }
}

export function assertPositiveInteger(
  value: number | null | undefined,
  field: string,
): void {
  if (!IsInteger(value) || Number(value) <= 0) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }
}

export function assertNullablePositiveInteger(
  value: number | null | undefined,
  field: string,
): void {
  if (value === undefined || value === null) {
    return;
  }
  assertPositiveInteger(value, field);
}

export function nullableNumber(
  value: number | null,
  field: string,
): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestException(`${field} must be a valid number`);
  }
  return value;
}

export function nullablePositiveNumber(
  value: number | null,
  field: string,
): number | null {
  if (value === null) {
    return null;
  }
  assertPositiveNumber(value, field);
  return value;
}

export function nullableNonNegativeNumber(
  value: number | null | undefined,
  field: string,
): number | null {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be 0 or greater`);
  }
  return value;
}

export function nullableNonNegativeInteger(
  value: number | null | undefined,
  field: string,
): number | null {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  if (!IsInteger(value) || value < 0) {
    throw new BadRequestException(`${field} must be a non-negative integer`);
  }
  return value;
}

export function normalizeSections(
  sections: { title: string; sortOrder: number }[],
): { title: string; sortOrder: number }[] {
  const sortOrders = new Set<number>();
  return sections.map((section) => {
    assertPositiveInteger(section.sortOrder, 'sortOrder');
    if (sortOrders.has(section.sortOrder)) {
      throw new BadRequestException('section sortOrder values must be unique');
    }
    sortOrders.add(section.sortOrder);
    return {
      title: requireText(section.title, 'section title'),
      sortOrder: section.sortOrder,
    };
  });
}

export function normalizeOptions(
  options: { optionLabel: string; optionText: string; isCorrect?: boolean }[],
  questionType: string,
): { optionLabel: string; optionText: string; isCorrect: boolean }[] {
  if (questionType === 'mcq' && options.length < 2) {
    throw new BadRequestException('MCQ questions require at least two options');
  }
  const labels = new Set<string>();
  const normalized = options.map((option) => {
    const optionLabel = requireText(
      option.optionLabel,
      'optionLabel',
    ).toUpperCase();
    if (labels.has(optionLabel)) {
      throw new BadRequestException(
        'optionLabel values must be unique per question',
      );
    }
    labels.add(optionLabel);
    return {
      optionLabel,
      optionText: requireText(option.optionText, 'optionText'),
      isCorrect: option.isCorrect ?? false,
    };
  });
  if (
    questionType === 'mcq' &&
    !normalized.some((option) => option.isCorrect)
  ) {
    throw new BadRequestException(
      'MCQ questions require at least one correct option',
    );
  }
  return normalized;
}

export function autoMarkResponse(
  question: {
    questionType: string;
    correctAnswer: string | null;
    widgetType?: string | null;
    widgetConfig?: any;
    options: { id: string; isCorrect: boolean }[];
  },
  selectedOptionId: string | null | undefined,
  responseText: string | null | undefined,
  interactionState: any,
  marksAvailable: number,
): { isCorrect?: boolean; marksAwarded?: number } {
  if (question.widgetType === 'STANDARD_MCQ' || question.questionType === 'mcq') {
    const option = question.options.find(
      (candidate) => candidate.id === selectedOptionId,
    );
    if (!option) {
      return { isCorrect: false, marksAwarded: 0 };
    }
    return {
      isCorrect: option.isCorrect,
      marksAwarded: option.isCorrect ? marksAvailable : 0,
    };
  }

  if (question.widgetType === 'SLIDER_MANIPULATIVE') {
    const target = question.correctAnswer ? parseFloat(question.correctAnswer) : null;
    const inputVal =
      interactionState?.finalValue !== undefined
        ? parseFloat(interactionState.finalValue)
        : null;

    if (target !== null && inputVal !== null) {
      const isCorrect = Math.abs(inputVal - target) <= 0.1;
      return { isCorrect, marksAwarded: isCorrect ? marksAvailable : 0 };
    }
  }

  if (question.widgetType === 'COORDINATE_PLOTTER' && question.widgetConfig) {
    const config = typeof question.widgetConfig === 'string'
      ? JSON.parse(question.widgetConfig)
      : question.widgetConfig;
    const correctPoints = config?.correctPoints ?? [];
    const tolerance = config?.tolerance ?? 0.1;
    const studentPoints = interactionState?.points ?? [];

    if (correctPoints.length !== studentPoints.length) {
      return { isCorrect: false, marksAwarded: 0 };
    }

    const allMatched = correctPoints.every((cp: any) => {
      return studentPoints.some((sp: any) => {
        const dx = cp.x - sp.x;
        const dy = cp.y - sp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= tolerance;
      });
    });

    return { isCorrect: allMatched, marksAwarded: allMatched ? marksAvailable : 0 };
  }

  if (question.widgetType === 'GRID_MATCHING' && question.widgetConfig) {
    const config = typeof question.widgetConfig === 'string'
      ? JSON.parse(question.widgetConfig)
      : question.widgetConfig;
    const correctPairs = config?.correctPairs ?? [];
    const studentPairs = interactionState?.pairs ?? [];

    if (correctPairs.length !== studentPairs.length) {
      return { isCorrect: false, marksAwarded: 0 };
    }

    const allMatched = correctPairs.every((cp: any) => {
      const cpLeft = cp[0];
      const cpRight = cp[1];
      return studentPairs.some((sp: any) => {
        return (sp[0] === cpLeft && sp[1] === cpRight) || (sp[0] === cpRight && sp[1] === cpLeft);
      });
    });

    return { isCorrect: allMatched, marksAwarded: allMatched ? marksAvailable : 0 };
  }

  if (
    (question.questionType === 'short_answer' ||
      question.questionType === 'numeric') &&
    question.correctAnswer
  ) {
    const cleanResponse = (responseText ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const cleanCorrect = (question.correctAnswer ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    if (question.questionType === 'numeric') {
      const numResponse = parseFloat(cleanResponse);
      const numCorrect = parseFloat(cleanCorrect);
      if (!isNaN(numResponse) && !isNaN(numCorrect)) {
        const isCorrect = numResponse === numCorrect;
        return { isCorrect, marksAwarded: isCorrect ? marksAvailable : 0 };
      }
    }

    const isCorrect = cleanResponse === cleanCorrect;
    return { isCorrect, marksAwarded: isCorrect ? marksAvailable : 0 };
  }
  return {};
}

export function requireRecord<T>(
  record: T | null | undefined,
  message: string,
): T {
  if (!record) {
    throw new NotFoundException(message);
  }
  return record;
}

function IsInteger(value: any): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

export async function audit(
  prisma: PrismaService,
  actorUserId: string,
  event: string,
  targetType?: string | null,
  targetId?: string | null,
  metadata?: any,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      event,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    },
  });
}
