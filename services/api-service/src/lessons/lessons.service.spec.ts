import { Test, TestingModule } from '@nestjs/testing';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';

describe('LessonsService', () => {
  let service: LessonsService;

  const mockProgressionService: any = {
    resolveStudentProfileId: jest.fn(),
    assertConceptUnlocked: jest.fn(),
    computeConceptUnlockState: jest.fn(),
    computeConceptDoneMap: jest.fn(),
  };

  const mockPrismaService = {
    lesson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    card: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    question: {
      create: jest.fn(),
    },
    questionOption: {
      create: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    lessonAttempt: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    studentCardResponse: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    studentExperience: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    studentStreak: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProgressionService,
          useValue: mockProgressionService,
        },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listLessons', () => {
    it('should return a list of lessons', async () => {
      const mockLessons = [
        { id: '1', title: 'Lesson 1', conceptId: 'c1' },
        { id: '2', title: 'Lesson 2', conceptId: 'c1' },
      ];
      mockPrismaService.lesson.findMany.mockResolvedValue(mockLessons);
      mockPrismaService.lesson.count.mockResolvedValue(mockLessons.length);

      // `listLessons` returns a page envelope, not a bare array — this test
      // predated that change and was silently failing while the jest harness
      // was unrunnable.
      const result = await service.listLessons('c1');
      expect(result).toEqual({
        items: mockLessons,
        total: mockLessons.length,
        page: 1,
        pageSize: 500,
      });
      expect(mockPrismaService.lesson.findMany).toHaveBeenCalledWith({
        where: { conceptId: 'c1' },
        orderBy: { sortOrder: 'asc' },
        skip: 0,
        take: 500,
        include: { concept: { select: { name: true } } },
      });
      expect(mockPrismaService.lesson.count).toHaveBeenCalledWith({
        where: { conceptId: 'c1' },
      });
    });
  });

  describe('submitCardResponse', () => {
    const mockStudent = { id: 'student-1', userId: 'user-1' };
    const mockCard = {
      id: 'card-1',
      lessonId: 'lesson-1',
      cardType: 'INTERACTIVE',
      lesson: { conceptId: 'concept-1' },
      question: {
        id: 'q-1',
        questionType: 'mcq',
        correctAnswer: null,
        options: [
          { id: 'opt-1', isCorrect: true },
          { id: 'opt-2', isCorrect: false },
        ],
      },
    };
    const mockAttempt = { id: 'attempt-1', status: 'IN_PROGRESS' };

    beforeEach(() => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(
        mockStudent,
      );
      mockPrismaService.card.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.lessonAttempt.findFirst.mockResolvedValue(mockAttempt);
      mockPrismaService.studentCardResponse.findUnique.mockResolvedValue(null);
      mockPrismaService.studentCardResponse.upsert.mockResolvedValue({
        attemptsCount: 1,
      });
      mockPrismaService.card.findMany.mockResolvedValue([mockCard]);
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([
        { cardId: 'card-1' },
      ]);
      mockPrismaService.studentExperience.findUnique.mockResolvedValue({
        totalXp: 10,
        level: 1,
        nextLevelXp: 100,
      });
      mockPrismaService.studentStreak.findUnique.mockResolvedValue({
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: new Date(),
        streakCharges: 1,
      });
    });

    it('should validate standard MCQ responses correctly', async () => {
      const submission = {
        timeSpentSeconds: 10,
        selectedOptionId: 'opt-1',
      };

      const result = await service.submitCardResponse(
        'user-1',
        'card-1',
        submission,
      );

      expect(result.isCorrect).toBe(true);
      expect(mockPrismaService.studentCardResponse.upsert).toHaveBeenCalled();
    });

    it('should fail invalid MCQ responses', async () => {
      const submission = {
        timeSpentSeconds: 10,
        selectedOptionId: 'opt-2',
      };

      const result = await service.submitCardResponse(
        'user-1',
        'card-1',
        submission,
      );

      expect(result.isCorrect).toBe(false);
    });

    it('never auto-passes a widget the grader could not resolve', async () => {
      // CODE_PLAYGROUND (and any newly-added widgetType with no generator
      // branch yet) resolves to UNSUPPORTED, so gradeWidgetSubmission
      // returns `{}` — isCorrect must land as false, not silently true,
      // regardless of what the student submitted.
      const ungradeableCard = {
        ...mockCard,
        question: {
          ...mockCard.question,
          questionType: 'interactive',
          widgetType: 'CODE_PLAYGROUND',
          widgetConfig: null,
        },
      };
      mockPrismaService.card.findUnique.mockResolvedValue(ungradeableCard);
      mockPrismaService.card.findMany.mockResolvedValue([ungradeableCard]);
      // The shared beforeEach stubs this to always return card-1 regardless
      // of the query's `isCorrect: true` filter; override it here so the
      // mock actually reflects "no correct responses exist yet" — matching
      // what a real Prisma query would return once this card grades false.
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([]);

      const result = await service.submitCardResponse('user-1', 'card-1', {
        timeSpentSeconds: 10,
        responseText: 'anything the student typed',
      });

      expect(result.isCorrect).toBe(false);
      expect(mockPrismaService.studentCardResponse.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isCorrect: false }),
          create: expect.objectContaining({ isCorrect: false }),
        }),
      );
      // No XP for a mark the system never actually verified.
      expect(mockPrismaService.studentExperience.update).not.toHaveBeenCalled();
    });
  });
});
