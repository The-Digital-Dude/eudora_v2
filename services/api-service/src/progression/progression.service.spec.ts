import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProgressionService', () => {
  let service: ProgressionService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    studentProfile: { findUnique: jest.fn() },
    concept: { findUnique: jest.fn(), findMany: jest.fn() },
    lessonAttempt: { findMany: jest.fn() },
    studentCardResponse: { findMany: jest.fn() },
  };

  const STUDENT_ID = 'student-1';
  const USER_ID = 'user-1';

  /** Two chapters: the first has one lesson, the second is gated behind it. */
  const twoChapters = [
    {
      id: 'concept-1',
      sortOrder: 1,
      kind: 'CHAPTER',
      passThresholdPercent: null,
      lessons: [{ id: 'lesson-1' }],
    },
    {
      id: 'concept-2',
      sortOrder: 2,
      kind: 'CHAPTER',
      passThresholdPercent: null,
      lessons: [{ id: 'lesson-2' }],
    },
  ];

  function asStudent(roles: string[] = ['USER']) {
    mockPrismaService.user.findUnique.mockResolvedValue({
      studentProfile: { id: STUDENT_ID },
      roles: roles.map((name) => ({ role: { name } })),
    });
  }

  /** Marks the given lesson ids as having a COMPLETED attempt. */
  function withCompletedLessons(lessonIds: string[]) {
    mockPrismaService.lessonAttempt.findMany.mockResolvedValue(
      lessonIds.map((lessonId) => ({ lessonId })),
    );
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.PROGRESSION_ENFORCEMENT;

    mockPrismaService.studentCardResponse.findMany.mockResolvedValue([]);
    mockPrismaService.concept.findMany.mockResolvedValue(twoChapters);
    mockPrismaService.concept.findUnique.mockResolvedValue({
      id: 'concept-2',
      courseId: 'course-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProgressionService>(ProgressionService);
  });

  describe('computeConceptUnlockState', () => {
    it('leaves the first chapter unlocked and gates the rest', async () => {
      withCompletedLessons([]);

      const state = await service.computeConceptUnlockState(
        STUDENT_ID,
        twoChapters,
      );

      expect(state).toEqual([
        { conceptId: 'concept-1', isDone: false, isLocked: false },
        { conceptId: 'concept-2', isDone: false, isLocked: true },
      ]);
    });

    it('unlocks the next chapter once the previous one is complete', async () => {
      withCompletedLessons(['lesson-1']);

      const state = await service.computeConceptUnlockState(
        STUDENT_ID,
        twoChapters,
      );

      expect(state[0]).toMatchObject({ isDone: true, isLocked: false });
      expect(state[1]).toMatchObject({ isDone: false, isLocked: false });
    });

    it('locks nothing when there is no student to track', async () => {
      const state = await service.computeConceptUnlockState(null, twoChapters);

      expect(state.every((s) => !s.isLocked && !s.isDone)).toBe(true);
    });

    it('orders by sortOrder rather than input order', async () => {
      withCompletedLessons([]);

      const state = await service.computeConceptUnlockState(STUDENT_ID, [
        twoChapters[1],
        twoChapters[0],
      ]);

      expect(state.map((s) => s.conceptId)).toEqual(['concept-1', 'concept-2']);
    });
  });

  describe('computeConceptDoneMap — CHECKPOINT threshold', () => {
    const checkpoint = [
      {
        id: 'cp-1',
        sortOrder: 1,
        kind: 'CHECKPOINT',
        passThresholdPercent: 70,
        lessons: [{ id: 'cp-lesson' }],
      },
    ];

    it('fails the checkpoint when first-try accuracy is under the threshold', async () => {
      withCompletedLessons(['cp-lesson']);
      // 1 of 3 correct on the first attempt = 33%, under the 70% bar.
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([
        { attemptsCount: 1, isCorrect: true, attempt: { lessonId: 'cp-lesson' } },
        { attemptsCount: 2, isCorrect: true, attempt: { lessonId: 'cp-lesson' } },
        { attemptsCount: 3, isCorrect: true, attempt: { lessonId: 'cp-lesson' } },
      ]);

      const doneMap = await service.computeConceptDoneMap(
        STUDENT_ID,
        checkpoint,
      );

      expect(doneMap.get('cp-1')).toBe(false);
    });

    it('passes the checkpoint when enough answers land first try', async () => {
      withCompletedLessons(['cp-lesson']);
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([
        { attemptsCount: 1, isCorrect: true, attempt: { lessonId: 'cp-lesson' } },
        { attemptsCount: 1, isCorrect: true, attempt: { lessonId: 'cp-lesson' } },
        { attemptsCount: 3, isCorrect: true, attempt: { lessonId: 'cp-lesson' } },
      ]);

      const doneMap = await service.computeConceptDoneMap(
        STUDENT_ID,
        checkpoint,
      );

      expect(doneMap.get('cp-1')).toBe(true);
    });
  });

  describe('assertConceptUnlocked', () => {
    it('rejects a locked concept when enforcing', async () => {
      process.env.PROGRESSION_ENFORCEMENT = 'enforce';
      asStudent();
      withCompletedLessons([]);

      await expect(
        service.assertConceptUnlocked(USER_ID, 'concept-2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows an unlocked concept', async () => {
      process.env.PROGRESSION_ENFORCEMENT = 'enforce';
      asStudent();
      withCompletedLessons(['lesson-1']);

      await expect(
        service.assertConceptUnlocked(USER_ID, 'concept-2'),
      ).resolves.toBeUndefined();
    });

    it('allows locked content through in log mode', async () => {
      asStudent();
      withCompletedLessons([]);

      await expect(
        service.assertConceptUnlocked(USER_ID, 'concept-2'),
      ).resolves.toBeUndefined();
    });

    it('exempts users without a student profile', async () => {
      process.env.PROGRESSION_ENFORCEMENT = 'enforce';
      mockPrismaService.user.findUnique.mockResolvedValue({
        studentProfile: null,
        roles: [{ role: { name: 'GUARDIAN' } }],
      });

      await expect(
        service.assertConceptUnlocked(USER_ID, 'concept-2'),
      ).resolves.toBeUndefined();
    });

    it.each(['SUPER_ADMIN', 'ADMIN', 'TEACHER'])(
      'exempts %s even when they own a student profile',
      async (role) => {
        // The seeded admin account really does have a StudentProfile, so this
        // is the case that would otherwise gate staff on their own history.
        process.env.PROGRESSION_ENFORCEMENT = 'enforce';
        asStudent([role]);
        withCompletedLessons([]);

        await expect(
          service.assertConceptUnlocked(USER_ID, 'concept-2'),
        ).resolves.toBeUndefined();
      },
    );

    it('skips concepts that belong to no course', async () => {
      process.env.PROGRESSION_ENFORCEMENT = 'enforce';
      asStudent();
      mockPrismaService.concept.findUnique.mockResolvedValue({
        id: 'orphan',
        courseId: null,
      });

      await expect(
        service.assertConceptUnlocked(USER_ID, 'orphan'),
      ).resolves.toBeUndefined();
      expect(mockPrismaService.concept.findMany).not.toHaveBeenCalled();
    });
  });
});
