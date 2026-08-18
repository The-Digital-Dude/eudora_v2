import { Test, TestingModule } from '@nestjs/testing';
import { GradeCalculationService } from './grade-calculation.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GradeCalculationService', () => {
  let service: GradeCalculationService;

  const mockPrismaService = {
    studentProfile: {
      findUnique: jest.fn(),
    },
    gradeBookEntry: {
      findMany: jest.fn(),
    },
    studentClassPlacement: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    batch: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeCalculationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GradeCalculationService>(GradeCalculationService);
    jest.clearAllMocks();
  });

  describe('calculateStudentAverages', () => {
    it('should throw NotFoundException if student does not exist', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.calculateStudentAverages('student-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty stats if no gradebook entries exist', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });
      mockPrismaService.gradeBookEntry.findMany.mockResolvedValue([]);

      const result = await service.calculateStudentAverages('student-1');
      expect(result).toEqual({
        categoryAverages: {},
        termAverage: null,
        gpa: null,
        letterGrade: 'N/A',
        classRank: null,
        classPercentile: null,
      });
    });

    it('should calculate weighted category averages and unweighted term average', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });
      mockPrismaService.gradeBookEntry.findMany.mockResolvedValue([
        { category: 'HOMEWORK', percentage: 80, weight: 1.0 },
        { category: 'HOMEWORK', percentage: 90, weight: 1.0 },
        { category: 'ASSESSMENT', percentage: 70, weight: 2.0 },
        { category: 'ASSESSMENT', percentage: 80, weight: 1.0 },
      ]);
      mockPrismaService.studentClassPlacement.findFirst.mockResolvedValue(null);

      const result = await service.calculateStudentAverages('student-1');
      expect(result.categoryAverages).toEqual({
        HOMEWORK: 85,
        ASSESSMENT: 73.33,
      });
      expect(result.termAverage).toBe(79.17);
      expect(result.gpa).toBe(2.0);
      expect(result.letterGrade).toBe('C');
    });

    it('should compute class rank and percentile correctly', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
      });
      mockPrismaService.studentClassPlacement.findFirst.mockResolvedValue({
        classSectionId: 'class-sec-1',
      });
      mockPrismaService.studentClassPlacement.findMany.mockResolvedValue([
        { studentProfileId: 'student-1' },
        { studentProfileId: 'student-2' },
        { studentProfileId: 'student-3' },
      ]);

      mockPrismaService.gradeBookEntry.findMany
        .mockResolvedValueOnce([
          { category: 'HOMEWORK', percentage: 90, weight: 1.0 },
        ])
        .mockResolvedValueOnce([
          { category: 'HOMEWORK', percentage: 90, weight: 1.0 },
        ])
        .mockResolvedValueOnce([
          { category: 'HOMEWORK', percentage: 95, weight: 1.0 },
        ])
        .mockResolvedValueOnce([
          { category: 'HOMEWORK', percentage: 80, weight: 1.0 },
        ]);

      const result = await service.calculateStudentAverages('student-1');
      expect(result.classRank).toBe(2);
      expect(result.classPercentile).toBe(50);
    });
  });
});
