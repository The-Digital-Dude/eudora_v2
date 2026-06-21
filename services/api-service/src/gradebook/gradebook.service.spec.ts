import { Test, TestingModule } from '@nestjs/testing';
import { GradebookService } from './gradebook.service';
import { PrismaService } from '../prisma/prisma.service';
import { GradeBookEntryStatus, GradeSourceType } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('GradebookService', () => {
  let service: GradebookService;
  let prisma: PrismaService;

  const mockPrismaService = {
    studentProfile: {
      findUnique: jest.fn(),
    },
    gradeBookEntry: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    studentClassPlacement: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    courseClass: {
      findUnique: jest.fn(),
    },
    homeworkSubmission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    assessmentAttempt: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradebookService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GradebookService>(GradebookService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createManualGrade', () => {
    it('should throw NotFoundException if student profile is not found', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.createManualGrade(
          {
            studentProfileId: 'non-existent',
            title: 'Quiz',
            pointsPossible: 100,
          },
          'teacher-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if pointsPossible is zero or negative', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({ id: 'student-1' });
      await expect(
        service.createManualGrade(
          {
            studentProfileId: 'student-1',
            title: 'Quiz',
            pointsPossible: 0,
          },
          'teacher-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create manual grade successfully', async () => {
      const mockStudent = { id: 'student-1' };
      const mockEntry = { id: 'entry-1', pointsEarned: 80, pointsPossible: 100 };
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.gradeBookEntry.upsert.mockResolvedValue(mockEntry);

      const result = await service.createManualGrade(
        {
          studentProfileId: 'student-1',
          title: 'Quiz',
          pointsEarned: 80,
          pointsPossible: 100,
        },
        'teacher-1',
      );

      expect(result).toEqual(mockEntry);
      expect(mockPrismaService.gradeBookEntry.upsert).toHaveBeenCalled();
    });
  });

  describe('upsertFromHomeworkSubmission', () => {
    it('should throw NotFoundException if homework submission is not found', async () => {
      mockPrismaService.homeworkSubmission.findUnique.mockResolvedValue(null);
      await expect(
        service.upsertFromHomeworkSubmission('sub-1', 90, 100, new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should upsert from submission successfully', async () => {
      const mockSubmission = {
        id: 'sub-1',
        studentProfileId: 'student-1',
        homework: {
          courseClassId: 'class-1',
          title: 'Homework 1',
          courseClass: { termId: 'term-1' },
        },
      };
      mockPrismaService.homeworkSubmission.findUnique.mockResolvedValue(mockSubmission);
      mockPrismaService.studentClassPlacement.findFirst.mockResolvedValue({
        classSectionId: 'class-sec-1',
      });
      mockPrismaService.gradeBookEntry.upsert.mockResolvedValue({ id: 'entry-1' });

      const result = await service.upsertFromHomeworkSubmission('sub-1', 90, 100, new Date());
      expect(result).toEqual({ id: 'entry-1' });
      expect(mockPrismaService.gradeBookEntry.upsert).toHaveBeenCalled();
    });
  });
});
