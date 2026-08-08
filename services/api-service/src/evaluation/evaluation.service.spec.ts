import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EvaluationService', () => {
  let service: EvaluationService;

  const mockGuardianAccessService: any = {
    getLinkedStudentIds: jest.fn(),
    assertCanAccessStudent: jest.fn(),
    assertCanAccessStudentRecord: jest.fn(),
    getGuardianFamilyId: jest.fn(),
  };

  const mockPrismaService: any = {
    concept: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    competency: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    rubric: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    rubricCriterion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    rubricLevel: {
      create: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    homeworkSubmission: {
      findUnique: jest.fn(),
    },
    assessmentEvidence: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    rubricAssessment: {
      create: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    rubricCriterionRating: {
      create: jest.fn(),
    },
    competencyMastery: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: any) => any): any => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GuardianAccessService,
          useValue: mockGuardianAccessService,
        },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
    jest.clearAllMocks();
  });

  describe('createConcept', () => {
    it('should throw BadRequestException if concept name already exists', async () => {
      mockPrismaService.concept.findUnique.mockResolvedValue({
        id: 'concept-1',
        name: 'Math',
      });
      await expect(
        service.createConcept({ name: 'Math', description: 'Desc' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a concept successfully', async () => {
      mockPrismaService.concept.findUnique.mockResolvedValue(null);
      mockPrismaService.concept.create.mockResolvedValue({
        id: 'concept-1',
        name: 'Math',
      });

      const result = await service.createConcept({
        name: 'Math',
        description: 'Desc',
      });
      expect(result.name).toBe('Math');
      expect(mockPrismaService.concept.create).toHaveBeenCalled();
    });
  });

  describe('createCompetency', () => {
    it('should throw NotFoundException if parent concept does not exist', async () => {
      mockPrismaService.concept.findUnique.mockResolvedValue(null);
      await expect(
        service.createCompetency({
          conceptId: 'non-existent',
          name: 'Compare Fractions',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create competency successfully', async () => {
      mockPrismaService.concept.findUnique.mockResolvedValue({
        id: 'concept-1',
      });
      mockPrismaService.competency.create.mockResolvedValue({
        id: 'comp-1',
        name: 'Compare Fractions',
      });

      const result = await service.createCompetency({
        conceptId: 'concept-1',
        name: 'Compare Fractions',
      });
      expect(result.name).toBe('Compare Fractions');
    });
  });

  describe('createRubric', () => {
    it('should throw NotFoundException if competency does not exist', async () => {
      mockPrismaService.competency.findUnique.mockResolvedValue(null);
      await expect(
        service.createRubric({
          competencyId: 'non-existent',
          name: 'Compare Rubric',
          criteria: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if rubric already exists for competency', async () => {
      mockPrismaService.competency.findUnique.mockResolvedValue({
        id: 'comp-1',
      });
      mockPrismaService.rubric.findFirst.mockResolvedValue({ id: 'rubric-1' });

      await expect(
        service.createRubric({
          competencyId: 'comp-1',
          name: 'Compare Rubric',
          criteria: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a rubric, its criteria and levels inside a transaction', async () => {
      mockPrismaService.competency.findUnique.mockResolvedValue({
        id: 'comp-1',
      });
      mockPrismaService.rubric.findFirst.mockResolvedValue(null);
      mockPrismaService.rubric.create.mockResolvedValue({ id: 'rubric-1' });
      mockPrismaService.rubricCriterion.create.mockResolvedValue({
        id: 'crit-1',
      });
      mockPrismaService.rubricLevel.create.mockResolvedValue({ id: 'lvl-1' });

      const mockFinalRubric = {
        id: 'rubric-1',
        name: 'Compare Rubric',
        criteria: [
          {
            id: 'crit-1',
            title: 'Correctness',
            levels: [{ level: 3, score: 3.0 }],
          },
        ],
      };
      mockPrismaService.rubric.findUnique.mockResolvedValue(mockFinalRubric);

      const result = await service.createRubric({
        competencyId: 'comp-1',
        name: 'Compare Rubric',
        criteria: [
          {
            title: 'Correctness',
            weight: 2.0,
            levels: [
              {
                level: 3,
                title: 'Proficient',
                description: 'desc',
                score: 3.0,
              },
            ],
          },
        ],
      });

      expect(result).toEqual(mockFinalRubric);
      expect(mockPrismaService.rubric.create).toHaveBeenCalled();
      expect(mockPrismaService.rubricCriterion.create).toHaveBeenCalled();
      expect(mockPrismaService.rubricLevel.create).toHaveBeenCalled();
    });
  });

  describe('evaluateEvidence', () => {
    const mockEvidence = {
      id: 'evidence-1',
      studentProfileId: 'student-1',
      competencyId: 'comp-1',
    };

    const mockRubric = {
      id: 'rubric-1',
      criteria: [
        {
          id: 'crit-1',
          title: 'Correctness',
          weight: 2.0,
          levels: [
            { level: 2, score: 2.0 },
            { level: 3, score: 3.0 },
            { level: 4, score: 4.0 },
          ],
        },
        {
          id: 'crit-2',
          title: 'Reasoning',
          weight: 1.0,
          levels: [
            { level: 2, score: 2.0 },
            { level: 3, score: 3.0 },
            { level: 4, score: 4.0 },
          ],
        },
      ],
    };

    it('should throw NotFoundException if evidence or rubric is missing', async () => {
      mockPrismaService.assessmentEvidence.findUnique.mockResolvedValue(null);
      await expect(
        service.evaluateEvidence(
          { rubricId: 'rubric-1', evidenceId: 'non-existent', ratings: [] },
          'evaluator-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate weighted average and trigger mastery engine update', async () => {
      mockPrismaService.assessmentEvidence.findUnique.mockResolvedValue(
        mockEvidence,
      );
      mockPrismaService.rubric.findUnique.mockResolvedValue(mockRubric);
      mockPrismaService.rubricAssessment.create.mockResolvedValue({
        id: 'assessment-1',
      });

      // Mock first assessment: no previous mastery exists
      mockPrismaService.competencyMastery.findUnique.mockResolvedValue(null);
      mockPrismaService.rubricAssessment.count.mockResolvedValue(1);

      const mockFinalAssessment = {
        id: 'assessment-1',
        overallScore: 3.0,
      };
      mockPrismaService.rubricAssessment.findUnique.mockResolvedValue(
        mockFinalAssessment,
      );

      // Ratings:
      // Correctness (weight 2) -> level 3 (score 3.0) -> weighted: 6.0
      // Reasoning (weight 1) -> level 3 (score 3.0) -> weighted: 3.0
      // Expected overall score: (6.0 + 3.0) / 3.0 = 3.0
      const result = await service.evaluateEvidence(
        {
          rubricId: 'rubric-1',
          evidenceId: 'evidence-1',
          feedback: 'Nice',
          ratings: [
            { criterionId: 'crit-1', selectedLevel: 3, comments: 'Good' },
            { criterionId: 'crit-2', selectedLevel: 3, comments: 'Logical' },
          ],
        },
        'evaluator-1',
      );

      expect(result!.overallScore).toBe(3.0);
      expect(mockPrismaService.rubricAssessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overallScore: 3.0,
          }),
        }),
      );

      // Verify mastery update parameters:
      // First score: 3.0
      // N=1 -> Confidence = 1 - e^(-0.5) = 0.393469
      expect(mockPrismaService.competencyMastery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            masteryScore: 3.0,
            confidence: expect.closeTo(0.393469, 5),
          }),
        }),
      );
    });

    it('should apply decaying average for subsequent assessments', async () => {
      mockPrismaService.assessmentEvidence.findUnique.mockResolvedValue(
        mockEvidence,
      );
      mockPrismaService.rubric.findUnique.mockResolvedValue(mockRubric);
      mockPrismaService.rubricAssessment.create.mockResolvedValue({
        id: 'assessment-2',
      });

      // Previous mastery score: 3.0
      mockPrismaService.competencyMastery.findUnique.mockResolvedValue({
        studentProfileId: 'student-1',
        competencyId: 'comp-1',
        masteryScore: 3.0,
        confidence: 0.393,
      });
      // This is the second assessment
      mockPrismaService.rubricAssessment.count.mockResolvedValue(2);

      const mockFinalAssessment = {
        id: 'assessment-2',
        overallScore: 4.0,
      };
      mockPrismaService.rubricAssessment.findUnique.mockResolvedValue(
        mockFinalAssessment,
      );

      // Ratings:
      // Correctness (weight 2) -> level 4 (score 4.0) -> weighted: 8.0
      // Reasoning (weight 1) -> level 4 (score 4.0) -> weighted: 4.0
      // Expected overall score: (8.0 + 4.0) / 3.0 = 4.0
      const result = await service.evaluateEvidence(
        {
          rubricId: 'rubric-1',
          evidenceId: 'evidence-1',
          feedback: 'Perfect',
          ratings: [
            { criterionId: 'crit-1', selectedLevel: 4 },
            { criterionId: 'crit-2', selectedLevel: 4 },
          ],
        },
        'evaluator-1',
      );

      expect(result!.overallScore).toBe(4.0);

      // Decaying average: Mastery(2) = 0.5 * 4.0 (new) + 0.5 * 3.0 (old) = 3.5
      // N=2 -> Confidence = 1 - e^(-1.0) = 0.63212
      expect(mockPrismaService.competencyMastery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            masteryScore: 3.5,
            confidence: expect.closeTo(0.63212, 5),
          }),
        }),
      );
    });
  });
});
