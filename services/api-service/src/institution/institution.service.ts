import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slug.util';
import {
  AttachProgramCourseDto,
  CreateProgramDto,
  ReorderProgramCoursesDto,
  UpdateProgramDto,
} from './dto/program.dto';
import { assertPriceFloor } from '../billing/pricing/price-rules';

/// Programs are the primary sellable SKU, so reads carry the Class they sit
/// under (null for standalone bundles) and the Courses they bundle.
const programInclude = {
  class: { select: { id: true, code: true, name: true, slug: true } },
  programCourses: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      sortOrder: true,
      isRequired: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          gradeBand: true,
          estimatedHours: true,
        },
      },
    },
  },
};

@Injectable()
export class InstitutionService {
  private readonly logger = new Logger(InstitutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Program Operations ---

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.program.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Program slug already exists');
    }
  }

  async createProgram(dto: CreateProgramDto) {
    const existingCode = await this.prisma.program.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException('Program code already exists');
    }

    assertPriceFloor(dto);

    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.assertSlugAvailable(slug);

    return this.prisma.program.create({
      data: { ...dto, slug },
      include: programInclude,
    });
  }

  async findAllPrograms(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

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
        orderBy: { createdAt: 'desc' },
        include: programInclude,
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
      include: programInclude,
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

    if (dto.code && dto.code !== program.code) {
      const existingCode = await this.prisma.program.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Program code already exists');
      }
    }

    assertPriceFloor(dto);

    // Only re-slug on an explicit slug change. Renaming a published program
    // must not silently break its public URL and any inbound links to it.
    const slug = dto.slug ? slugify(dto.slug) : undefined;
    if (slug) {
      await this.assertSlugAvailable(slug, id);
    }

    return this.prisma.program.update({
      where: { id },
      data: { ...dto, ...(slug ? { slug } : {}) },
      include: programInclude,
    });
  }

  // --- Program <-> Course wiring -------------------------------------------
  // Courses are reusable across Programs (Class 9 and Class 10 Science both
  // teach Physics), so this is a join rather than a `programId` on Course.

  async attachCourse(programId: string, dto: AttachProgramCourseDto) {
    await this.findProgramById(programId);

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, deletedAt: null },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existing = await this.prisma.programCourse.findUnique({
      where: { programId_courseId: { programId, courseId: dto.courseId } },
    });
    if (existing) {
      throw new ConflictException('Course is already attached to this program');
    }

    return this.prisma.programCourse.create({
      data: {
        programId,
        courseId: dto.courseId,
        sortOrder: dto.sortOrder ?? 0,
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  async detachCourse(programId: string, courseId: string) {
    const link = await this.prisma.programCourse.findUnique({
      where: { programId_courseId: { programId, courseId } },
    });
    if (!link) {
      throw new NotFoundException('Course is not attached to this program');
    }

    await this.prisma.programCourse.delete({ where: { id: link.id } });
    return { message: 'Course detached from program' };
  }

  async reorderCourses(programId: string, dto: ReorderProgramCoursesDto) {
    await this.findProgramById(programId);

    await this.prisma.$transaction(
      dto.courseIds.map((courseId, index) =>
        this.prisma.programCourse.update({
          where: { programId_courseId: { programId, courseId } },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.findProgramById(programId);
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
}
