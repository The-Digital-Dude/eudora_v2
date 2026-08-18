import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let mockEntitlements: { resolveCourseAccess: jest.Mock };

  const mockPrismaService = {
    learningSubject: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    learningPath: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    learningPathCourse: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    lessonAttempt: {
      findMany: jest.fn(),
    },
    studentCardResponse: {
      findMany: jest.fn(),
    },
    moduleItemProgress: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    // Stubbed rather than real: these tests exercise progression unlock state,
    // which is orthogonal to whether the viewer paid. Entitlement gating has
    // its own coverage below.
    mockEntitlements = {
      resolveCourseAccess: jest.fn().mockResolvedValue({
        allowed: true,
        isStaff: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrismaService },
        // Real ProgressionService, backed by the same mocked PrismaService —
        // its unlock-computation logic is what these tests exercise, and it
        // has its own dedicated coverage in progression.service.spec.ts.
        ProgressionService,
        { provide: EntitlementsService, useValue: mockEntitlements },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLearningSubject', () => {
    it('rejects a duplicate code', async () => {
      mockPrismaService.learningSubject.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.createLearningSubject({ code: 'MATH', name: 'Math' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.learningSubject.create).not.toHaveBeenCalled();
    });

    it('creates a subject with default sortOrder', async () => {
      mockPrismaService.learningSubject.findUnique.mockResolvedValue(null);
      mockPrismaService.learningSubject.create.mockResolvedValue({
        id: 'sub-1',
        code: 'MATH',
        name: 'Math',
      });

      const result = await service.createLearningSubject({
        code: 'MATH',
        name: 'Math',
      });

      expect(result.id).toBe('sub-1');
      expect(mockPrismaService.learningSubject.create).toHaveBeenCalledWith({
        data: {
          code: 'MATH',
          name: 'Math',
          description: null,
          icon: null,
          sortOrder: 0,
        },
      });
    });
  });

  describe('getCourseDetail — sequential unlock state', () => {
    const course = {
      id: 'course-1',
      deletedAt: null,
      status: 'PUBLISHED',
      learningSubject: { id: 'sub-1', name: 'Math' },
      concepts: [
        {
          id: 'concept-1',
          sortOrder: 1,
          kind: 'CHAPTER',
          passThresholdPercent: null,
          lessons: [{ id: 'lesson-1' }],
          items: [],
        },
        {
          id: 'concept-2',
          sortOrder: 2,
          kind: 'CHAPTER',
          passThresholdPercent: null,
          lessons: [{ id: 'lesson-2' }],
          items: [],
        },
        {
          id: 'concept-3',
          sortOrder: 3,
          kind: 'CHAPTER',
          passThresholdPercent: null,
          lessons: [{ id: 'lesson-3' }],
          items: [],
        },
      ],
    };

    it('unlocks only the first chapter when nothing is completed', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });
      mockPrismaService.lessonAttempt.findMany.mockResolvedValue([]);

      const result = await service.getCourseDetail('course-1', 'user-1');

      expect(result.concepts[0]).toMatchObject({
        id: 'concept-1',
        isDone: false,
        isLocked: false,
      });
      expect(result.concepts[1]).toMatchObject({
        id: 'concept-2',
        isDone: false,
        isLocked: true,
      });
      expect(result.concepts[2]).toMatchObject({
        id: 'concept-3',
        isDone: false,
        isLocked: true,
      });
    });

    it('unlocks the next chapter once the previous one is completed', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });
      mockPrismaService.lessonAttempt.findMany.mockResolvedValue([
        { lessonId: 'lesson-1' },
      ]);

      const result = await service.getCourseDetail('course-1', 'user-1');

      expect(result.concepts[0]).toMatchObject({
        isDone: true,
        isLocked: false,
      });
      expect(result.concepts[1]).toMatchObject({
        isDone: false,
        isLocked: false,
      });
      expect(result.concepts[2]).toMatchObject({
        isDone: false,
        isLocked: true,
      });
    });

    it('throws NotFoundException for a missing course', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.getCourseDetail('missing', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCourseDetail — checkpoint pass threshold', () => {
    const courseWithCheckpoint = {
      id: 'course-2',
      deletedAt: null,
      status: 'PUBLISHED',
      learningSubject: { id: 'sub-1', name: 'Math' },
      concepts: [
        {
          id: 'chapter-1',
          sortOrder: 1,
          kind: 'CHAPTER',
          passThresholdPercent: null,
          lessons: [{ id: 'lesson-1' }],
          items: [],
        },
        {
          id: 'checkpoint-1',
          sortOrder: 2,
          kind: 'CHECKPOINT',
          passThresholdPercent: 80,
          lessons: [{ id: 'lesson-checkpoint' }],
          items: [],
        },
        {
          id: 'chapter-2',
          sortOrder: 3,
          kind: 'CHAPTER',
          passThresholdPercent: null,
          lessons: [{ id: 'lesson-2' }],
          items: [],
        },
      ],
    };

    beforeEach(() => {
      mockPrismaService.course.findUnique.mockResolvedValue(
        courseWithCheckpoint,
      );
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });
      mockPrismaService.lessonAttempt.findMany.mockResolvedValue([
        { lessonId: 'lesson-1' },
        { lessonId: 'lesson-checkpoint' },
      ]);
    });

    it('keeps the next chapter locked when checkpoint accuracy is below threshold', async () => {
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([
        {
          attemptsCount: 1,
          isCorrect: true,
          attempt: { lessonId: 'lesson-checkpoint' },
        },
        {
          attemptsCount: 2,
          isCorrect: true,
          attempt: { lessonId: 'lesson-checkpoint' },
        },
      ]);

      const result = await service.getCourseDetail('course-2', 'user-1');

      expect(
        result.concepts.find((c) => c.id === 'checkpoint-1'),
      ).toMatchObject({
        isDone: false,
      });
      expect(result.concepts.find((c) => c.id === 'chapter-2')).toMatchObject({
        isLocked: true,
      });
    });

    it('unlocks the next chapter once checkpoint accuracy meets the threshold', async () => {
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([
        {
          attemptsCount: 1,
          isCorrect: true,
          attempt: { lessonId: 'lesson-checkpoint' },
        },
        {
          attemptsCount: 1,
          isCorrect: true,
          attempt: { lessonId: 'lesson-checkpoint' },
        },
      ]);

      const result = await service.getCourseDetail('course-2', 'user-1');

      expect(
        result.concepts.find((c) => c.id === 'checkpoint-1'),
      ).toMatchObject({
        isDone: true,
      });
      expect(result.concepts.find((c) => c.id === 'chapter-2')).toMatchObject({
        isLocked: false,
      });
    });
  });

  describe('addCourseToPath', () => {
    it('rejects when the course is already part of the path', async () => {
      mockPrismaService.learningPath.findUnique.mockResolvedValue({
        id: 'path-1',
      });
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
      });
      mockPrismaService.learningPathCourse.findUnique.mockResolvedValue({
        pathId: 'path-1',
        courseId: 'course-1',
      });

      await expect(
        service.addCourseToPath('path-1', { courseId: 'course-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the path does not exist', async () => {
      mockPrismaService.learningPath.findUnique.mockResolvedValue(null);
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
      });

      await expect(
        service.addCourseToPath('missing-path', { courseId: 'course-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCourseDetail — entitlement gating', () => {
    // The outline must stay fully visible even when unpaid — it is the sales
    // pitch and the indexable content. Only the payloads are withheld.
    const gatedCourse = {
      id: 'course-1',
      deletedAt: null,
      status: 'PUBLISHED',
      learningSubject: { id: 'sub-1', name: 'Math' },
      concepts: [
        {
          id: 'concept-1',
          sortOrder: 1,
          kind: 'CHAPTER',
          passThresholdPercent: null,
          lessons: [],
          items: [
            {
              id: 'item-free',
              title: 'Intro',
              kind: 'VIDEO',
              sortOrder: 1,
              isFreePreview: true,
              videoUrl: 'https://cdn.example/intro.mp4',
              readingContent: null,
              assessmentId: null,
            },
            {
              id: 'item-paid',
              title: 'Deep dive',
              kind: 'READING',
              sortOrder: 2,
              isFreePreview: false,
              videoUrl: null,
              readingContent: 'the paid body',
              assessmentId: 'assessment-1',
            },
          ],
        },
      ],
    };

    beforeEach(() => {
      mockPrismaService.course.findUnique.mockResolvedValue(gatedCourse);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });
      mockPrismaService.lessonAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([]);
      mockPrismaService.moduleItemProgress.findMany.mockResolvedValue([]);
    });

    it('withholds paid item bodies but keeps the free preview playable', async () => {
      mockEntitlements.resolveCourseAccess.mockResolvedValue({
        allowed: false,
        isStaff: false,
        reason: 'NOT_ENTITLED',
      });

      const result = await service.getCourseDetail('course-1', 'user-1');
      const [free, paid] = result.concepts[0].items;

      expect(result.isEntitled).toBe(false);

      expect(free).toMatchObject({
        id: 'item-free',
        isContentLocked: false,
        videoUrl: 'https://cdn.example/intro.mp4',
      });

      expect(paid).toMatchObject({
        id: 'item-paid',
        isContentLocked: true,
        readingContent: null,
        assessmentId: null,
      });
      // The row itself is still returned — the learner sees what exists.
      expect(paid.title).toBe('Deep dive');
    });

    it('returns every body once entitled', async () => {
      mockEntitlements.resolveCourseAccess.mockResolvedValue({
        allowed: true,
        isStaff: false,
      });

      const result = await service.getCourseDetail('course-1', 'user-1');
      const [free, paid] = result.concepts[0].items;

      expect(result.isEntitled).toBe(true);
      expect(free.isContentLocked).toBe(false);
      expect(paid).toMatchObject({
        isContentLocked: false,
        readingContent: 'the paid body',
        assessmentId: 'assessment-1',
      });
    });
  });
});
