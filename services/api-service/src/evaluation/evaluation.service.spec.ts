import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('EvaluationService', () => {
  let service: EvaluationService;

  const mockPrismaService: any = {
    concept: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
});
