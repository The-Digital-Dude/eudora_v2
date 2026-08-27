import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSort } from '../common/sort.util';
import {
  CreateStudentProfileDto,
  UpdateMyStudentProfileDto,
  UpdateStudentProfileDto,
} from './dto/student-profile.dto';
import { CreatePlacementDto, UpdatePlacementDto } from './dto/placement.dto';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/enrollment.dto';

const STUDENT_SORTABLE_FIELDS = ['fullName', 'gender', 'status'] as const;

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Student Profile Operations ---

  /** Self-service — `userId` comes from the JWT, never the request body. */
  async updateMyProfile(userId: string, dto: UpdateMyStudentProfileDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    return this.prisma.studentProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async createProfile(dto: CreateStudentProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const existingProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: dto.userId },
    });
    if (existingProfile) {
      throw new ConflictException(
        'A student profile already exists for this user',
      );
    }

    return this.prisma.studentProfile.create({
      data: {
        userId: dto.userId,
        fullName: dto.fullName,
        birthDate: new Date(dto.birthDate),
        gender: dto.gender,
        status: dto.status,
      },
    });
  }

  async findAllProfiles(
    page = 1,
    limit = 10,
    status?: string,
    includeArchived = false,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    // includeArchived is a scoping-extension arg, stripped before validation.
    const archivedArg = includeArchived ? { includeArchived: true } : {};
    const orderBy = resolveSort(
      sortBy,
      sortOrder,
      STUDENT_SORTABLE_FIELDS,
      'fullName',
    );

    const [profiles, total, placedStudents, enrollmentTotal] =
      await Promise.all([
        this.prisma.studentProfile.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
          orderBy,
          ...archivedArg,
        } as any),
        this.prisma.studentProfile.count({ where, ...archivedArg } as any),
        // Roster-wide stats for the summary cards. Deliberately unfiltered and unpaginated: the
        // cards describe the whole roster, so deriving them from the current page (as the client
        // used to) undercounted as soon as the roster outgrew a single page.
        this.prisma.studentProfile.count({
          where: { placements: { some: {} } },
        }),
        this.prisma.studentCourseEnrollment.count(),
      ]);

    return {
      data: profiles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: { placedStudents, enrollmentTotal },
      },
    };
  }

  async findProfileById(id: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        placements: { include: { classSection: true, academicYear: true } },
        enrollments: { include: { batch: true } },
        guardians: { include: { guardianProfile: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    return profile;
  }

  async updateProfile(id: string, dto: UpdateStudentProfileDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    if (dto.userId && dto.userId !== profile.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user || user.deletedAt) {
        throw new NotFoundException('User not found');
      }

      const existingProfile = await this.prisma.studentProfile.findUnique({
        where: { userId: dto.userId },
      });
      if (existingProfile) {
        throw new ConflictException(
          'A student profile already exists for this user',
        );
      }
    }

    return this.prisma.studentProfile.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  async deleteProfile(id: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    // Rewritten to an archive (deletedAt) by the row-scoping extension.
    await this.prisma.studentProfile.delete({
      where: { id },
    });

    return { message: 'Student profile archived successfully' };
  }

  async restoreProfile(id: string) {
    // includeArchived: archived rows are invisible to plain reads by design.
    const profile = await (this.prisma.studentProfile.findUnique as any)({
      where: { id },
      includeArchived: true,
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    if (!profile.deletedAt) {
      return { message: 'Student profile is not archived', profile };
    }

    const restored = await this.prisma.studentProfile.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
    });
    return {
      message: 'Student profile restored successfully',
      profile: restored,
    };
  }

  // --- Student Class Placement Operations ---

  async createPlacement(dto: CreatePlacementDto) {
    const [student, section, year] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { id: dto.studentProfileId },
      }),
      this.prisma.classSection.findUnique({
        where: { id: dto.classSectionId },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: dto.academicYearId },
      }),
    ]);

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    if (!section) {
      throw new NotFoundException('Class section not found');
    }
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }

    if (section.academicYearId !== dto.academicYearId) {
      throw new BadRequestException(
        'Class section does not belong to the specified academic year',
      );
    }

    const existingPlacement =
      await this.prisma.studentClassPlacement.findUnique({
        where: {
          studentProfileId_classSectionId: {
            studentProfileId: dto.studentProfileId,
            classSectionId: dto.classSectionId,
          },
        },
      });
    if (existingPlacement) {
      throw new ConflictException(
        'This student is already placed in this class section',
      );
    }

    return this.prisma.studentClassPlacement.create({
      data: dto,
    });
  }

  async findAllPlacements(
    page = 1,
    limit = 10,
    studentProfileId?: string,
    classSectionId?: string,
    academicYearId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (studentProfileId) where.studentProfileId = studentProfileId;
    if (classSectionId) where.classSectionId = classSectionId;
    if (academicYearId) where.academicYearId = academicYearId;

    const [placements, total] = await Promise.all([
      this.prisma.studentClassPlacement.findMany({
        where,
        skip,
        take: limit,
        include: {
          studentProfile: true,
          classSection: true,
          academicYear: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.studentClassPlacement.count({ where }),
    ]);

    return {
      data: placements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPlacement(studentProfileId: string, classSectionId: string) {
    const placement = await this.prisma.studentClassPlacement.findUnique({
      where: {
        studentProfileId_classSectionId: { studentProfileId, classSectionId },
      },
      include: {
        studentProfile: true,
        classSection: true,
        academicYear: true,
      },
    });
    if (!placement) {
      throw new NotFoundException('Student placement not found');
    }
    return placement;
  }

  async updatePlacement(
    studentProfileId: string,
    classSectionId: string,
    dto: UpdatePlacementDto,
  ) {
    const placement = await this.prisma.studentClassPlacement.findUnique({
      where: {
        studentProfileId_classSectionId: { studentProfileId, classSectionId },
      },
    });
    if (!placement) {
      throw new NotFoundException('Student placement not found');
    }

    return this.prisma.studentClassPlacement.update({
      where: {
        studentProfileId_classSectionId: { studentProfileId, classSectionId },
      },
      data: dto,
    });
  }

  async deletePlacement(studentProfileId: string, classSectionId: string) {
    const placement = await this.prisma.studentClassPlacement.findUnique({
      where: {
        studentProfileId_classSectionId: { studentProfileId, classSectionId },
      },
    });
    if (!placement) {
      throw new NotFoundException('Student placement not found');
    }

    await this.prisma.studentClassPlacement.delete({
      where: {
        studentProfileId_classSectionId: { studentProfileId, classSectionId },
      },
    });

    return { message: 'Student placement removed successfully' };
  }

  // --- Student Course Enrollment Operations ---

  async createEnrollment(dto: CreateEnrollmentDto) {
    const [student, batch] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { id: dto.studentProfileId },
      }),
      this.prisma.batch.findUnique({ where: { id: dto.batchId } }),
    ]);

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    if (!batch) {
      throw new NotFoundException('Course class not found');
    }

    const existingEnrollment =
      await this.prisma.studentCourseEnrollment.findUnique({
        where: {
          studentProfileId_batchId: {
            studentProfileId: dto.studentProfileId,
            batchId: dto.batchId,
          },
        },
      });
    if (existingEnrollment) {
      throw new ConflictException(
        'Student is already enrolled in this course class',
      );
    }

    return this.prisma.studentCourseEnrollment.create({
      data: {
        studentProfileId: dto.studentProfileId,
        batchId: dto.batchId,
        enrollmentDate: dto.enrollmentDate
          ? new Date(dto.enrollmentDate)
          : undefined,
        status: dto.status,
      },
    });
  }

  async findAllEnrollments(
    page = 1,
    limit = 10,
    studentProfileId?: string,
    batchId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (studentProfileId) where.studentProfileId = studentProfileId;
    if (batchId) where.batchId = batchId;

    const [enrollments, total] = await Promise.all([
      this.prisma.studentCourseEnrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          studentProfile: true,
          batch: true,
        },
        orderBy: { enrollmentDate: 'desc' },
      }),
      this.prisma.studentCourseEnrollment.count({ where }),
    ]);

    return {
      data: enrollments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findEnrollmentById(id: string) {
    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        batch: true,
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    return enrollment;
  }

  async updateEnrollment(id: string, dto: UpdateEnrollmentDto) {
    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      where: { id },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.prisma.studentCourseEnrollment.update({
      where: { id },
      data: {
        status: dto.status,
        enrollmentDate: dto.enrollmentDate
          ? new Date(dto.enrollmentDate)
          : undefined,
      },
    });
  }

  async deleteEnrollment(id: string) {
    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      where: { id },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    await this.prisma.studentCourseEnrollment.delete({
      where: { id },
    });

    return { message: 'Enrollment deleted successfully' };
  }
}
