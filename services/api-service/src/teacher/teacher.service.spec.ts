import { Test, TestingModule } from '@nestjs/testing';
import { TeacherService } from './teacher.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TeacherStatus } from '@prisma/client';

describe('TeacherService', () => {
  let service: TeacherService;

  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    teacherProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    classSection: {
      findUnique: jest.fn(),
    },
    classTeacher: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: any) => any): any => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TeacherService>(TeacherService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ConflictException if user with email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      await expect(
        service.create({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if employee code is already in use', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        employeeCode: 'EMP001',
      });

      await expect(
        service.create({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          employeeCode: 'EMP001',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if TEACHER role is missing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a teacher profile, user, and assign role successfully', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockRole = { id: 'role-teacher', name: 'TEACHER' };
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        fullName: 'John Doe',
        status: TeacherStatus.ACTIVE,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.create.mockResolvedValue({
        userId: 'user-1',
        roleId: 'role-teacher',
      });
      mockPrismaService.teacherProfile.create.mockResolvedValue(mockProfile);

      const result = await service.create({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        employeeCode: 'EMP001',
        specialization: 'Math',
      });

      expect(result).toEqual(mockProfile);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.userRole.create).toHaveBeenCalled();
      expect(mockPrismaService.teacherProfile.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated teacher profiles list', async () => {
      const teachers = [{ id: '1', fullName: 'Teacher 1' }];
      mockPrismaService.teacherProfile.findMany.mockResolvedValue(teachers);
      mockPrismaService.teacherProfile.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);
      expect(result.data).toEqual(teachers);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if teacher profile does not exist', async () => {
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return teacher profile if found', async () => {
      const profile = { id: '1', fullName: 'John' };
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(profile);

      const result = await service.findById('1');
      expect(result).toEqual(profile);
    });
  });

  describe('findByUserId', () => {
    it('should throw NotFoundException if teacher profile is not found by userId', async () => {
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);

      await expect(service.findByUserId('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return teacher profile if found by userId', async () => {
      const profile = { id: '1', userId: 'user-1', fullName: 'John' };
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(profile);

      const result = await service.findByUserId('user-1');
      expect(result).toEqual(profile);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { fullName: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updated employee code is in use by another teacher', async () => {
      mockPrismaService.teacherProfile.findUnique
        .mockResolvedValueOnce({ id: 'profile-1', employeeCode: 'EMP001' }) // first call for teacher exists check
        .mockResolvedValueOnce({ id: 'profile-2', employeeCode: 'EMP002' }); // second call for employeeCode conflict check

      await expect(
        service.update('profile-1', { employeeCode: 'EMP002' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update teacher profile details successfully', async () => {
      const updatedProfile = { id: 'profile-1', fullName: 'Updated Name' };
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        employeeCode: 'EMP001',
      });
      mockPrismaService.teacherProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.update('profile-1', {
        fullName: 'Updated Name',
      });
      expect(result).toEqual(updatedProfile);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should soft-delete teacher profile and user successfully', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
      });
      mockPrismaService.teacherProfile.update.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.delete('profile-1');
      expect(result.message).toContain('soft-deleted successfully');
      expect(mockPrismaService.teacherProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'profile-1' },
          data: { status: TeacherStatus.INACTIVE },
        }),
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('assignClass', () => {
    it('should throw NotFoundException if teacher does not exist', async () => {
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.classSection.findUnique.mockResolvedValue({
        id: 'sec-1',
      });

      await expect(
        service.assignClass('non-existent', {
          classSectionId: 'sec-1',
          role: 'PRIMARY',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if class section does not exist', async () => {
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue({
        id: 'profile-1',
      });
      mockPrismaService.classSection.findUnique.mockResolvedValue(null);

      await expect(
        service.assignClass('profile-1', {
          classSectionId: 'non-existent',
          role: 'PRIMARY',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if teacher is already assigned to this section', async () => {
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue({
        id: 'profile-1',
      });
      mockPrismaService.classSection.findUnique.mockResolvedValue({
        id: 'sec-1',
      });
      mockPrismaService.classTeacher.findUnique.mockResolvedValue({
        teacherProfileId: 'profile-1',
        classSectionId: 'sec-1',
      });

      await expect(
        service.assignClass('profile-1', {
          classSectionId: 'sec-1',
          role: 'PRIMARY',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should assign teacher to class section successfully', async () => {
      const mockAssignment = {
        teacherProfileId: 'profile-1',
        classSectionId: 'sec-1',
        role: 'PRIMARY',
      };
      mockPrismaService.teacherProfile.findFirst.mockResolvedValue({
        id: 'profile-1',
      });
      mockPrismaService.classSection.findUnique.mockResolvedValue({
        id: 'sec-1',
      });
      mockPrismaService.classTeacher.findUnique.mockResolvedValue(null);
      mockPrismaService.classTeacher.create.mockResolvedValue(mockAssignment);

      const result = await service.assignClass('profile-1', {
        classSectionId: 'sec-1',
        role: 'PRIMARY',
      });
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('removeClass', () => {
    it('should throw NotFoundException if assignment does not exist', async () => {
      mockPrismaService.classTeacher.findUnique.mockResolvedValue(null);

      await expect(service.removeClass('profile-1', 'sec-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove class assignment successfully', async () => {
      mockPrismaService.classTeacher.findUnique.mockResolvedValue({
        teacherProfileId: 'profile-1',
        classSectionId: 'sec-1',
      });
      mockPrismaService.classTeacher.delete.mockResolvedValue({});

      const result = await service.removeClass('profile-1', 'sec-1');
      expect(result.message).toContain('removed successfully');
      expect(mockPrismaService.classTeacher.delete).toHaveBeenCalled();
    });
  });
});
