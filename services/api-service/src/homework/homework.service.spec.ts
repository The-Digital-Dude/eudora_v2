import { Test, TestingModule } from '@nestjs/testing';
import { HomeworkService } from './homework.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { GradebookService } from '../gradebook/gradebook.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';

describe('HomeworkService', () => {
  let service: HomeworkService;

  // Annotated because $transaction hands this object back to the callback,
  // which makes it self-referential and otherwise uninferable.
  const mockPrismaService: any = {
    batch: {
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
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    fileUpload: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    homeworkSubmissionAttachment: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    moduleItemProgress: {
      upsert: jest.fn(),
    },
    // Submitting is a transaction, so the mock has to behave like one:
    // hand the callback this same mock and let it act as its own tx client.
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  };

  const mockGradebookService = {
    upsertFromHomeworkSubmission: jest.fn(),
  };

  /** Defaults to allowing access; individual tests override it. */
  const mockEntitlementsService = {
    canAccessModuleItem: jest.fn().mockResolvedValue(true),
  };

  /** Who is doing the submitting — a student acting for themselves, here. */
  const ACTOR = { userId: 'user-1', roles: ['USER'] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeworkService,
        {
          provide: EntitlementsService,
          useValue: mockEntitlementsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GradebookService,
          useValue: mockGradebookService,
        },
      ],
    }).compile();

    service = module.get<HomeworkService>(HomeworkService);
    jest.clearAllMocks();
  });

  describe('createHomework', () => {
    it('should throw NotFoundException if course class does not exist', async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue(null);
      await expect(
        service.createHomework(
          {
            batchId: 'non-existent',
            title: 'Title',
            dueDate: new Date().toISOString(),
            maxPoints: 100,
          },
          'user-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if due date is invalid', async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue({
        id: 'class-1',
      });
      await expect(
        service.createHomework(
          {
            batchId: 'class-1',
            title: 'Title',
            dueDate: 'invalid-date',
            maxPoints: 100,
          },
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a homework assignment successfully', async () => {
      const mockClass = { id: 'class-1' };
      const mockHomework = { id: 'hw-1', title: 'Title' };
      mockPrismaService.batch.findUnique.mockResolvedValue(mockClass);
      mockPrismaService.homework.create.mockResolvedValue(mockHomework);

      const result = await service.createHomework(
        {
          batchId: 'class-1',
          title: 'Title',
          description: 'Desc',
          dueDate: new Date().toISOString(),
          maxPoints: 100,
          attachmentUrls: ['http://link'],
        },
        'user-id',
      );

      expect(result).toEqual(mockHomework);
      expect(mockPrismaService.homework.create).toHaveBeenCalled();
    });
  });

  describe('submitHomework', () => {
    it('should throw BadRequestException if submit text content and attachments are both missing', async () => {
      await expect(
        service.submitHomework(
          'student-1',
          {
            homeworkId: 'hw-1',
          },
          ACTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if homework does not exist', async () => {
      mockPrismaService.homework.findUnique.mockResolvedValue(null);
      await expect(
        service.submitHomework(
          'student-1',
          {
            homeworkId: 'non-existent',
            content: 'my solution',
          },
          ACTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if student is not enrolled', async () => {
      mockPrismaService.homework.findUnique.mockResolvedValue({
        id: 'hw-1',
        batchId: 'class-1',
      });
      mockPrismaService.studentCourseEnrollment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.submitHomework(
          'student-1',
          {
            homeworkId: 'hw-1',
            content: 'my solution',
          },
          ACTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit homework successfully', async () => {
      const mockHomework = {
        id: 'hw-1',
        batchId: 'class-1',
        dueDate: new Date(Date.now() + 10000), // future due date
      };
      mockPrismaService.homework.findUnique.mockResolvedValue(mockHomework);
      mockPrismaService.studentCourseEnrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
      });
      mockPrismaService.homeworkSubmission.upsert.mockResolvedValue({
        id: 'submission-1',
        status: SubmissionStatus.SUBMITTED,
      });
      // The submission is re-read after its attachments are linked, so that
      // read is what the caller actually receives.
      mockPrismaService.homeworkSubmission.findUniqueOrThrow.mockResolvedValue({
        id: 'submission-1',
        status: SubmissionStatus.SUBMITTED,
        attachments: [],
      });

      const result = await service.submitHomework(
        'student-1',
        {
          homeworkId: 'hw-1',
          content: 'my solution',
        },
        ACTOR,
      );

      expect(result.status).toEqual(SubmissionStatus.SUBMITTED);
      expect(mockPrismaService.homeworkSubmission.upsert).toHaveBeenCalled();
    });

    it('should mark submission as late if past due date', async () => {
      const mockHomework = {
        id: 'hw-1',
        batchId: 'class-1',
        dueDate: new Date(Date.now() - 10000), // past due date
      };
      mockPrismaService.homework.findUnique.mockResolvedValue(mockHomework);
      mockPrismaService.studentCourseEnrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
      });
      mockPrismaService.homeworkSubmission.upsert.mockImplementation(
        ({ create }: any) => ({
          id: 'submission-1',
          status: create.status,
        }),
      );
      mockPrismaService.homeworkSubmission.findUniqueOrThrow.mockResolvedValue({
        id: 'submission-1',
        status: SubmissionStatus.LATE,
        attachments: [],
      });

      const result = await service.submitHomework(
        'student-1',
        {
          homeworkId: 'hw-1',
          content: 'my solution',
        },
        ACTOR,
      );

      expect(result.status).toEqual(SubmissionStatus.LATE);
    });
  });

  describe('gradeSubmission', () => {
    it('should throw NotFoundException if submission does not exist', async () => {
      mockPrismaService.homeworkSubmission.findUnique.mockResolvedValue(null);
      await expect(
        service.gradeSubmission(
          'sub-1',
          {
            pointsEarned: 10,
            feedback: 'Nice',
          },
          'teacher-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if points earned exceed max points', async () => {
      mockPrismaService.homeworkSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        homework: { maxPoints: 5 },
      });
      await expect(
        service.gradeSubmission(
          'sub-1',
          {
            pointsEarned: 10,
            feedback: 'Nice',
          },
          'teacher-1',
        ),
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

      const result = await service.gradeSubmission(
        'sub-1',
        {
          pointsEarned: 8,
          feedback: 'Good work',
        },
        'teacher-1',
      );

      expect(result.status).toEqual(SubmissionStatus.GRADED);
      expect(result.pointsEarned).toEqual(8);
    });
  });

  describe('getStudentPendingHomework', () => {
    it('should throw NotFoundException if student profile does not exist', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.getStudentPendingHomework('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return pending homeworks successfully', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
        enrollments: [{ batchId: 'class-1' }],
      });
      mockPrismaService.homework.findMany.mockResolvedValue([
        {
          id: 'hw-1',
          batchId: 'class-1',
          submissions: [], // No submission
        },
        {
          id: 'hw-2',
          batchId: 'class-1',
          submissions: [{ id: 'sub-1' }], // Has submission
        },
      ]);

      const result = await service.getStudentPendingHomework('student-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hw-1');
    });
  });
});
