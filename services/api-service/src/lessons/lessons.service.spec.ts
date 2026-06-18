import { Test, TestingModule } from '@nestjs/testing';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LessonsService', () => {
  let service: LessonsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lesson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
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
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
    prisma = module.get<PrismaService>(PrismaService);

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

      const result = await service.listLessons('c1');
      expect(result).toEqual(mockLessons);
      expect(mockPrismaService.lesson.findMany).toHaveBeenCalledWith({
        where: { conceptId: 'c1' },
        orderBy: { sortOrder: 'asc' },
        include: { concept: { select: { name: true } } },
      });
    });
  });

  describe('submitCardResponse', () => {
    const mockStudent = { id: 'student-1', userId: 'user-1' };
    const mockCard = {
      id: 'card-1',
      lessonId: 'lesson-1',
      cardType: 'INTERACTIVE',
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
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.card.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.lessonAttempt.findFirst.mockResolvedValue(mockAttempt);
      mockPrismaService.studentCardResponse.findUnique.mockResolvedValue(null);
      mockPrismaService.studentCardResponse.upsert.mockResolvedValue({ attemptsCount: 1 });
      mockPrismaService.card.findMany.mockResolvedValue([mockCard]);
      mockPrismaService.studentCardResponse.findMany.mockResolvedValue([{ cardId: 'card-1' }]);
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

      const result = await service.submitCardResponse('user-1', 'card-1', submission);

      expect(result.isCorrect).toBe(true);
      expect(mockPrismaService.studentCardResponse.upsert).toHaveBeenCalled();
    });

    it('should fail invalid MCQ responses', async () => {
      const submission = {
        timeSpentSeconds: 10,
        selectedOptionId: 'opt-2',
      };

      const result = await service.submitCardResponse('user-1', 'card-1', submission);

      expect(result.isCorrect).toBe(false);
    });
  });
});
