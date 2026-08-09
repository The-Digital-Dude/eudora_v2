import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ConceptWithLessons = {
  id: string;
  sortOrder: number;
  kind: string;
  passThresholdPercent: number | null;
  lessons: { id: string }[];
};

export type ConceptUnlockState = {
  conceptId: string;
  isDone: boolean;
  isLocked: boolean;
};

/** Roles that author or supervise content rather than progress through it. */
const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);

/**
 * Owns the "has this student unlocked this chapter yet?" rule.
 *
 * It lives in its own module rather than on CatalogService because both the
 * catalog (module-item progress) and the lessons module (card submission) have
 * to enforce it, and making either depend on the other would be circular.
 */
@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enforcement is config-gated so the rule can be switched on in two steps.
   * It has never actually been enforced — the flags were computed for display
   * only — so an unknown number of students may already hold out-of-order
   * progress that would start throwing the moment this turns on. Run in 'log'
   * until the warnings go quiet, then flip to 'enforce'.
   */
  private get enforcementMode(): 'log' | 'enforce' {
    return process.env.PROGRESSION_ENFORCEMENT === 'enforce'
      ? 'enforce'
      : 'log';
  }

  async resolveStudentProfileId(userId: string): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }

  /**
   * Throws when the student has not yet unlocked the concept.
   *
   * Two ways to be exempt. Having no student profile at all is the obvious one
   * — a guardian or teacher is not on a progression track. The second is
   * holding a staff role, which matters because profiles and roles are not
   * mutually exclusive: the seeded admin account owns a StudentProfile, so
   * without this check an admin exercising content would be gated by their own
   * incidental lesson history.
   */
  async assertConceptUnlocked(userId: string, conceptId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        studentProfile: { select: { id: true } },
        roles: { select: { role: { select: { name: true } } } },
      },
    });

    const studentProfileId = user?.studentProfile?.id;
    if (!studentProfileId) {
      return;
    }

    const isStaff = (user?.roles ?? []).some((r) =>
      STAFF_ROLES.has(r.role.name),
    );
    if (isStaff) {
      return;
    }

    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
      select: { id: true, courseId: true },
    });

    // A concept outside any course has no siblings to be sequenced against.
    if (!concept?.courseId) {
      return;
    }

    const siblings = await this.prisma.concept.findMany({
      where: { courseId: concept.courseId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        sortOrder: true,
        kind: true,
        passThresholdPercent: true,
        lessons: { select: { id: true } },
      },
    });

    const state = await this.computeConceptUnlockState(
      studentProfileId,
      siblings,
    );
    const target = state.find((s) => s.conceptId === conceptId);

    if (!target?.isLocked) {
      return;
    }

    if (this.enforcementMode === 'log') {
      this.logger.warn(
        `[progression] would block student ${studentProfileId} from locked ` +
          `concept ${conceptId} (course ${concept.courseId}) — running in log ` +
          `mode, request allowed`,
      );
      return;
    }

    throw new ForbiddenException(
      'Complete the previous chapter before continuing',
    );
  }

  async computeConceptUnlockState(
    studentProfileId: string | null,
    concepts: ConceptWithLessons[],
  ): Promise<ConceptUnlockState[]> {
    const ordered = [...concepts].sort((a, b) => a.sortOrder - b.sortOrder);

    if (!studentProfileId) {
      return ordered.map((concept) => ({
        conceptId: concept.id,
        isDone: false,
        isLocked: false,
      }));
    }

    const doneMap = await this.computeConceptDoneMap(studentProfileId, ordered);

    let previousDone = true;
    return ordered.map((concept) => {
      const isDone = doneMap.get(concept.id) ?? false;
      const isLocked = !previousDone;
      previousDone = isDone;
      return { conceptId: concept.id, isDone, isLocked };
    });
  }

  private async getCompletedLessonIds(
    studentProfileId: string,
    lessonIds: string[],
  ): Promise<Set<string>> {
    if (lessonIds.length === 0) {
      return new Set();
    }
    const completed = await this.prisma.lessonAttempt.findMany({
      where: {
        studentProfileId,
        lessonId: { in: lessonIds },
        status: 'COMPLETED',
      },
      select: { lessonId: true },
    });
    return new Set(completed.map((a) => a.lessonId));
  }

  // A concept is "done" once every lesson under it has a COMPLETED attempt.
  // CHECKPOINT concepts additionally require a first-try accuracy of at
  // least passThresholdPercent across their (non-conceptual) cards — a
  // student who only got everything right after retries has completed the
  // lesson, but hasn't passed the checkpoint.
  async computeConceptDoneMap(
    studentProfileId: string,
    concepts: ConceptWithLessons[],
  ): Promise<Map<string, boolean>> {
    const allLessonIds = concepts.flatMap((c) => c.lessons.map((l) => l.id));
    const completedIds = await this.getCompletedLessonIds(
      studentProfileId,
      allLessonIds,
    );

    const checkpointConcepts = concepts.filter(
      (c) => c.kind === 'CHECKPOINT' && c.passThresholdPercent != null,
    );
    const checkpointLessonIds = checkpointConcepts.flatMap((c) =>
      c.lessons.map((l) => l.id),
    );

    const responses = checkpointLessonIds.length
      ? await this.prisma.studentCardResponse.findMany({
          where: {
            attempt: {
              studentProfileId,
              lessonId: { in: checkpointLessonIds },
              status: 'COMPLETED',
            },
            card: { cardType: { not: 'CONCEPTUAL' } },
          },
          select: {
            attemptsCount: true,
            isCorrect: true,
            attempt: { select: { lessonId: true } },
          },
        })
      : [];

    const responsesByLesson = new Map<
      string,
      { attemptsCount: number; isCorrect: boolean }[]
    >();
    for (const r of responses) {
      const lessonId = r.attempt.lessonId;
      if (!responsesByLesson.has(lessonId)) {
        responsesByLesson.set(lessonId, []);
      }
      responsesByLesson.get(lessonId)!.push(r);
    }

    const doneMap = new Map<string, boolean>();
    for (const concept of concepts) {
      const allLessonsCompleted =
        concept.lessons.length > 0 &&
        concept.lessons.every((l) => completedIds.has(l.id));

      if (!allLessonsCompleted) {
        doneMap.set(concept.id, false);
        continue;
      }

      if (
        concept.kind !== 'CHECKPOINT' ||
        concept.passThresholdPercent == null
      ) {
        doneMap.set(concept.id, true);
        continue;
      }

      const checkpointResponses = concept.lessons.flatMap(
        (l) => responsesByLesson.get(l.id) ?? [],
      );
      if (checkpointResponses.length === 0) {
        doneMap.set(concept.id, true);
        continue;
      }

      const firstTryCorrect = checkpointResponses.filter(
        (r) => r.isCorrect && r.attemptsCount === 1,
      ).length;
      const scorePercent = (firstTryCorrect / checkpointResponses.length) * 100;
      doneMap.set(concept.id, scorePercent >= concept.passThresholdPercent);
    }

    return doneMap;
  }
}
