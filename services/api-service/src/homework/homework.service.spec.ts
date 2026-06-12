import { Test, TestingModule } from '@nestjs/testing';
import { HomeworkService } from './homework.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';

describe('HomeworkService', () => {
  let service: HomeworkService;
  let prisma: PrismaService;

  const mockPrismaService = {
    courseClass: {
      findUnique: jest.fn(),
    },
    homework: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    studentCourseEnrollment: {
      findUnique: jest.fn(),
    },
    homeworkSubmission: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeworkService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HomeworkService>(HomeworkService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createHomework', () => {
    it('should throw NotFoundException if course class does not exist', async () => {
      mockPrismaService.courseClass.findUnique.mockResolvedValue(null);
      await expect(
        service.createHomework({
          courseClassId: 'non-existent',
          title: 'Title',
          dueDate: new Date().toISOString(),
          maxPoints: 100,
        }, 'user-id')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if due date is invalid', async () => {
      mockPrismaService.courseClass.findUnique.mockResolvedValue({ id: 'class-1' });
      await expect(
        service.createHomework({
          courseClassId: 'class-1',
          title: 'Title',
          dueDate: 'invalid-date',
          maxPoints: 100,
        }, 'user-id')
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a homework assignment successfully', async () => {
      const mockClass = { id: 'class-1' };
      const mockHomework = { id: 'hw-1', title: 'Title' };
      mockPrismaService.courseClass.findUnique.mockResolvedValue(mockClass);
      mockPrismaService.homework.create.mockResolvedValue(mockHomework);

      const result = await service.createHomework({
        courseClassId: 'class-1',
        title: 'Title',
        description: 'Desc',
        dueDate: new Date().toISOString(),
        maxPoints: 100,
        attachmentUrl: 'http://link',
      }, 'user-id');

      expect(result).toEqual(mockHomework);
      expect(mockPrismaService.homework.create).toHaveBeenCalled();
    });
  });

  describe('submitHomework', () => {
    it('should throw NotFoundException if homework does not exist', async () => {
      mockPrismaService.homework.findUnique.mockResolvedValue(null);
      await expect(
        service.submitHomework('student-1', {
          homeworkId: 'non-existent',
          content: 'my solution',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if student is not enrolled', async () => {
      mockPrismaService.homework.findUnique.mockResolvedValue({ id: 'hw-1', courseClassId: 'class-1' });
      mockPrismaService.studentCourseEnrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.submitHomework('student-1', {
          homeworkId: 'hw-1',
          content: 'my solution',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit homework successfully', async () => {
      const mockHomework = {
        id: 'hw-1',
        courseClassId: 'class-1',
        dueDate: new Date(Date.now() + 10000), // future due date
      };
      mockPrismaService.homework.findUnique.mockResolvedValue(mockHomework);
      mockPrismaService.studentCourseEnrollment.findUnique.mockResolvedValue({ id: 'enroll-1' });
      mockPrismaService.homeworkSubmission.upsert.mockResolvedValue({ id: 'submission-1', status: SubmissionStatus.SUBMITTED });

      const result = await service.submitHomework('student-1', {
        homeworkId: 'hw-1',
        content: 'my solution',
      });

      expect(result.status).toEqual(SubmissionStatus.SUBMITTED);
      expect(mockPrismaService.homeworkSubmission.upsert).toHaveBeenCalled();
    });

    it('should mark submission as late if past due date', async () => {
      const mockHomework = {
        id: 'hw-1',
        courseClassId: 'class-1',
        dueDate: new Date(Date.now() - 10000), // past due date
      };
      mockPrismaService.homework.findUnique.mockResolvedValue(mockHomework);
      mockPrismaService.studentCourseEnrollment.findUnique.mockResolvedValue({ id: 'enroll-1' });
      mockPrismaService.homeworkSubmission.upsert.mockImplementation(({ create }) => ({
        id: 'submission-1',
        status: create.status,
      }));

      const result = await service.submitHomework('student-1', {
        homeworkId: 'hw-1',
        content: 'my solution',
      });

      expect(result.status).toEqual(SubmissionStatus.LATE);
    });
  });

  describe('gradeSubmission', () => {
    it('should throw NotFoundException if submission does not exist', async () => {
      mockPrismaService.homeworkSubmission.findUnique.mockResolvedValue(null);
      await expect(
        service.gradeSubmission('sub-1', {
          pointsEarned: 10,
          feedback: 'Nice',
        }, 'teacher-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if points earned exceed max points', async () => {
      mockPrismaService.homeworkSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        homework: { maxPoints: 5 },
      });
      await expect(
        service.gradeSubmission('sub-1', {
          pointsEarned: 10,
          feedback: 'Nice',
        }, 'teacher-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should grade submission successfully', async () => {
      mockPrismaService.homeworkSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        homework: { maxPoints: 10 },
      });
      mockPrismaService.homeworkSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: SubmissionStatus.GRADED,
        pointsEarned: 8,
      });

      const result = await service.gradeSubmission('sub-1', {
        pointsEarned: 8,
        feedback: 'Good work',
      }, 'teacher-1');

      expect(result.status).toEqual(SubmissionStatus.GRADED);
      expect(result.pointsEarned).toEqual(8);
    });
  });
});
