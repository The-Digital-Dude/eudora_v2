import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampusDto, UpdateCampusDto } from './dto/campus.dto';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { CreateCampusCourseDto, UpdateCampusCourseDto } from './dto/campus-course.dto';
import { GuardianAccessService } from '../family/guardian-access.service';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

// Only these roles bypass campus-restricted catalog visibility entirely.
// TEACHER is deliberately excluded — a teacher sees what their own campus's
// students see, not the whole platform, so plan-tier restriction actually
// means something for them too.
const CAMPUS_BYPASS_ROLES = ['SUPER_ADMIN', 'ADMIN'];

@Injectable()
export class InstitutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  /**
   * Resolves which campus(es) a user is actively associated with, for
   * campus-restricted catalog visibility (see `CampusCourse` in
   * schema.prisma). Returns `null` for SUPER_ADMIN/ADMIN — bypass, they see
   * every campus's content. Returns `[]` when the user has no resolvable
   * active campus (no active placement/assignment) — callers must treat
   * that as "only globally-unassigned content visible," never as "show
   * everything." Neither `StudentProfile` nor `TeacherProfile` carries a
   * `campusId` directly, so this always traverses the placement/assignment
   * chain down to `Program.campusId`.
   */
  async resolveCampusIdsForUser(
    user: CurrentUserDto,
  ): Promise<string[] | null> {
    if (user.roles.some((role) => CAMPUS_BYPASS_ROLES.includes(role))) {
      return null;
    }

    if (user.roles.includes('TEACHER')) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!teacherProfile) return [];
      const assignments = await this.prisma.classTeacher.findMany({
        where: { teacherProfileId: teacherProfile.id },
        select: {
          classSection: { select: { program: { select: { campusId: true } } } },
        },
      });
      return [
        ...new Set(assignments.map((a) => a.classSection.program.campusId)),
      ];
    }

    if (user.studentProfile) {
      return this.resolveCampusIdsForStudent(user.studentProfile.id);
    }

    if (user.roles.includes('GUARDIAN')) {
      return this.guardianAccessService.getLinkedCampusIds(user.id);
    }

    return [];
  }

  /**
   * Campus(es) one specific student is actively placed at. Split out from
   * `resolveCampusIdsForUser` because guardian-facing routes act on a single
   * named child — `GuardianAccessService.getLinkedCampusIds` unions *every*
   * linked child's campuses, which is too broad when the caller has already
   * said which child they mean.
   */
  async resolveCampusIdsForStudent(
    studentProfileId: string,
  ): Promise<string[]> {
    const placements = await this.prisma.studentClassPlacement.findMany({
      where: { studentProfileId, isActive: true },
      select: {
        classSection: { select: { program: { select: { campusId: true } } } },
      },
    });
    return [...new Set(placements.map((p) => p.classSection.program.campusId))];
  }

  // --- Campus Operations ---

  async createCampus(dto: CreateCampusDto) {
    const existing = await this.prisma.campus.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Campus name already exists');
    }
    if (dto.code) {
      const existingCode = await this.prisma.campus.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Campus code already exists');
      }
    }

    return this.prisma.campus.create({
      data: dto,
    });
  }

  async findAllCampuses(
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    // `name` only: Campus.representative is accepted by the DTO but no screen sets or shows it, so
    // it's a pending removal candidate — not something to build a search on.
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [campuses, total] = await Promise.all([
      this.prisma.campus.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campus.count({ where }),
    ]);

    return {
      data: campuses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findCampusById(id: string) {
    const campus = await this.prisma.campus.findUnique({
      where: { id },
      include: { programs: true },
    });
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }
    return campus;
  }

  async updateCampus(id: string, dto: UpdateCampusDto) {
    const campus = await this.prisma.campus.findUnique({
      where: { id },
    });
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }

    if (dto.name && dto.name !== campus.name) {
      const existing = await this.prisma.campus.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Campus name already exists');
      }
    }
    if (dto.code && dto.code !== campus.code) {
      const existingCode = await this.prisma.campus.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Campus code already exists');
      }
    }

    return this.prisma.campus.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCampus(id: string) {
    const campus = await this.prisma.campus.findUnique({
      where: { id },
    });
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }

    // Cascade-archive programs and their class sections with the campus.
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const programs = await tx.program.findMany({
        where: { campusId: id },
        select: { id: true },
      });
      const programIds = programs.map((p) => p.id);
      await tx.classSection.updateMany({
        where: { programId: { in: programIds }, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.program.updateMany({
        where: { campusId: id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.campus.update({ where: { id }, data: { deletedAt: now } });
    });

    return { message: 'Campus archived successfully' };
  }

  // --- Program Operations ---

  async createProgram(dto: CreateProgramDto) {
    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
    });
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }

    const existingCode = await this.prisma.program.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException('Program code already exists');
    }

    return this.prisma.program.create({
      data: dto,
    });
  }

  async findAllPrograms(
    page = 1,
    limit = 10,
    campusId?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (campusId) {
      where.campusId = campusId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [programs, total] = await Promise.all([
      this.prisma.program.findMany({
        where,
        skip,
        take: limit,
        include: { campus: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.program.count({ where }),
    ]);

    return {
      data: programs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findProgramById(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: { campus: true },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }
    return program;
  }

  async updateProgram(id: string, dto: UpdateProgramDto) {
    const program = await this.prisma.program.findUnique({
      where: { id },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (dto.campusId) {
      const campus = await this.prisma.campus.findUnique({
        where: { id: dto.campusId },
      });
      if (!campus) {
        throw new NotFoundException('Campus not found');
      }
    }

    if (dto.code && dto.code !== program.code) {
      const existingCode = await this.prisma.program.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Program code already exists');
      }
    }

    return this.prisma.program.update({
      where: { id },
      data: dto,
    });
  }

  async deleteProgram(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    await this.prisma.program.delete({
      where: { id },
    });

    return { message: 'Program deleted successfully' };
  }

  // --- Campus Course Visibility Operations ---

  async getCampusCourses(campusId: string) {
    const campus = await this.prisma.campus.findUnique({
      where: { id: campusId },
    });
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }
    return this.prisma.campusCourse.findMany({
      where: { campusId },
      include: {
        course: {
          select: { id: true, title: true, slug: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignCourseToCampus(campusId: string, dto: CreateCampusCourseDto) {
    const [campus, course] = await Promise.all([
      this.prisma.campus.findUnique({ where: { id: campusId } }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
    ]);
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.prisma.campusCourse.upsert({
      where: {
        campusId_courseId: { campusId, courseId: dto.courseId },
      },
      update: { enabled: dto.enabled ?? true },
      create: {
        campusId,
        courseId: dto.courseId,
        enabled: dto.enabled ?? true,
      },
      include: {
        course: {
          select: { id: true, title: true, slug: true, status: true },
        },
      },
    });
  }

  async updateCampusCourse(
    campusId: string,
    courseId: string,
    dto: UpdateCampusCourseDto,
  ) {
    const existing = await this.prisma.campusCourse.findUnique({
      where: { campusId_courseId: { campusId, courseId } },
    });
    if (!existing) {
      throw new NotFoundException('This course is not assigned to this campus');
    }
    return this.prisma.campusCourse.update({
      where: { campusId_courseId: { campusId, courseId } },
      data: { enabled: dto.enabled },
    });
  }

  async removeCampusCourse(campusId: string, courseId: string) {
    const existing = await this.prisma.campusCourse.findUnique({
      where: { campusId_courseId: { campusId, courseId } },
    });
    if (!existing) {
      throw new NotFoundException('This course is not assigned to this campus');
    }
    await this.prisma.campusCourse.delete({
      where: { campusId_courseId: { campusId, courseId } },
    });
    return { message: 'Course removed from campus' };
  }
}
