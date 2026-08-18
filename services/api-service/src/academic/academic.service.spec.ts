import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Batch guards only.
 *
 * A `Batch` is what a LIVE course is sold as a seat in, so these three checks
 * each protect something a customer paid for.
 */
describe('AcademicService — batch guards', () => {
  let service: AcademicService;

  const prisma: any = {
    batch: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    term: { findUnique: jest.fn() },
    course: { findFirst: jest.fn() },
    teacherProfile: { findFirst: jest.fn() },
    studentCourseEnrollment: { count: jest.fn() },
  };

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(AcademicService);
    jest.clearAllMocks();

    // Defaults: every other guard passes, so each test isolates one.
    prisma.batch.findUnique.mockResolvedValue(null);
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.teacherProfile.findFirst.mockResolvedValue({ id: 'teacher-1' });
    prisma.studentCourseEnrollment.count.mockResolvedValue(0);
  });

  describe('lead teacher validation', () => {
    it('rejects an unknown lead teacher on create with a 404, not an FK crash', async () => {
      prisma.teacherProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.createBatch({
          name: 'B',
          code: 'B1',
          leadTeacherProfileId: 'ghost',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.batch.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown lead teacher on update too', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1', code: 'B1' });
      prisma.teacherProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.updateBatch('b1', { leadTeacherProfileId: 'ghost' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.batch.update).not.toHaveBeenCalled();
    });

    it('ignores a soft-deleted teacher', async () => {
      // findFirst is scoped to deletedAt: null, so a deleted teacher resolves
      // to nothing and must be treated as missing.
      prisma.teacherProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.createBatch({
          name: 'B',
          code: 'B1',
          leadTeacherProfileId: 'gone',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows a batch with no lead teacher at all', async () => {
      prisma.batch.create.mockResolvedValue({ id: 'b1' });

      await service.createBatch({ name: 'B', code: 'B1' });

      expect(prisma.teacherProfile.findFirst).not.toHaveBeenCalled();
      expect(prisma.batch.create).toHaveBeenCalled();
    });
  });

  describe('delete guard', () => {
    it('refuses to delete a batch that has enrolled students', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.studentCourseEnrollment.count.mockResolvedValue(3);

      await expect(service.deleteBatch('b1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.batch.delete).not.toHaveBeenCalled();
    });

    it('deletes an empty batch', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.studentCourseEnrollment.count.mockResolvedValue(0);

      await service.deleteBatch('b1');

      expect(prisma.batch.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
    });

    it('404s on a batch that does not exist', async () => {
      prisma.batch.findUnique.mockResolvedValue(null);

      await expect(service.deleteBatch('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
