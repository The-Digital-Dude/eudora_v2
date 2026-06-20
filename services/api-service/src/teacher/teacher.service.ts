import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { TeacherStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeacherDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.employeeCode) {
      const existingCode = await this.prisma.teacherProfile.findUnique({
        where: { employeeCode: dto.employeeCode },
      });
      if (existingCode) {
        throw new ConflictException('Employee code is already in use');
      }
    }

    const hashedPassword = await bcrypt.hash('Teacher@123', 10);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          password: hashedPassword,
          isActive: true,
        },
      });

      // 2. Assign TEACHER role
      const teacherRole = await tx.role.findUnique({
        where: { name: 'TEACHER' },
      });
      if (!teacherRole) {
        throw new NotFoundException('TEACHER role not found in database');
      }

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: teacherRole.id,
        },
      });

      // 3. Create Teacher Profile
      return tx.teacherProfile.create({
        data: {
          userId: user.id,
          fullName: `${dto.firstName} ${dto.lastName}`,
          employeeCode: dto.employeeCode,
          phone: dto.phone,
          specialization: dto.specialization,
          status: dto.status ?? TeacherStatus.ACTIVE,
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  async findAll(page = 1, limit = 10, status?: TeacherStatus, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {
      user: { deletedAt: null },
    };

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [teachers, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          classAssignments: { include: { classSection: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.teacherProfile.count({ where }),
    ]);

    return {
      data: teachers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id, user: { deletedAt: null } },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        classAssignments: { include: { classSection: true } },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }
    return teacher;
  }

  async findByUserId(userId: string) {
    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { userId, user: { deletedAt: null } },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        classAssignments: { include: { classSection: true } },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found for this user');
    }
    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    if (dto.employeeCode && dto.employeeCode !== teacher.employeeCode) {
      const existingCode = await this.prisma.teacherProfile.findUnique({
        where: { employeeCode: dto.employeeCode },
      });
      if (existingCode) {
        throw new ConflictException('Employee code is already in use');
      }
    }

    return this.prisma.teacherProfile.update({
      where: { id },
      data: dto,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        classAssignments: { include: { classSection: true } },
      },
    });
  }

  async delete(id: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Set status to INACTIVE
      await tx.teacherProfile.update({
        where: { id },
        data: { status: TeacherStatus.INACTIVE },
      });

      // Soft delete the User record
      await tx.user.update({
        where: { id: teacher.userId },
        data: { deletedAt: new Date() },
      });

      return { message: 'Teacher profile soft-deleted successfully' };
    });
  }

  async assignClass(teacherProfileId: string, dto: AssignClassDto) {
    const [teacher, classSection] = await Promise.all([
      this.prisma.teacherProfile.findFirst({ where: { id: teacherProfileId, user: { deletedAt: null } } }),
      this.prisma.classSection.findUnique({ where: { id: dto.classSectionId } }),
    ]);

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }
    if (!classSection) {
      throw new NotFoundException('Class section not found');
    }

    const existingAssignment = await this.prisma.classTeacher.findUnique({
      where: {
        teacherProfileId_classSectionId: {
          teacherProfileId,
          classSectionId: dto.classSectionId,
        },
      },
    });
    if (existingAssignment) {
      throw new ConflictException('Teacher is already assigned to this class section');
    }

    return this.prisma.classTeacher.create({
      data: {
        teacherProfileId,
        classSectionId: dto.classSectionId,
        role: dto.role ?? 'PRIMARY',
      },
      include: {
        classSection: true,
      },
    });
  }

  async removeClass(teacherProfileId: string, classSectionId: string) {
    const assignment = await this.prisma.classTeacher.findUnique({
      where: {
        teacherProfileId_classSectionId: {
          teacherProfileId,
          classSectionId,
        },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Class assignment not found');
    }

    await this.prisma.classTeacher.delete({
      where: {
        teacherProfileId_classSectionId: {
          teacherProfileId,
          classSectionId,
        },
      },
    });

    return { message: 'Class assignment removed successfully' };
  }
}
