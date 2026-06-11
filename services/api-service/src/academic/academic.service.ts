import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto/academic-year.dto';
import { CreateTermDto, UpdateTermDto } from './dto/term.dto';
import { CreateClassSectionDto, UpdateClassSectionDto } from './dto/class-section.dto';
import { CreateCourseClassDto, UpdateCourseClassDto } from './dto/course-class.dto';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Academic Year Operations ---

  async createAcademicYear(dto: CreateAcademicYearDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const existing = await this.prisma.academicYear.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Academic year name already exists');
    }

    return this.prisma.academicYear.create({
      data: {
        name: dto.name,
        startDate: start,
        endDate: end,
        status: dto.status,
      },
    });
  }

  async findAllAcademicYears(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [years, total] = await Promise.all([
      this.prisma.academicYear.findMany({
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.academicYear.count(),
    ]);

    return {
      data: years,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAcademicYearById(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: { terms: true, classSections: true },
    });
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }
    return year;
  }

  async updateAcademicYear(id: string, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
    });
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }

    if (dto.name && dto.name !== year.name) {
      const existing = await this.prisma.academicYear.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Academic year name already exists');
      }
    }

    const start = dto.startDate ? new Date(dto.startDate) : year.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : year.endDate;
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Also if academic year dates contract, we should ideally check that terms still fit.
    // However, to keep it simple, we'll validate the bounds of any updated date values.
    return this.prisma.academicYear.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? start : undefined,
        endDate: dto.endDate ? end : undefined,
      },
    });
  }

  async deleteAcademicYear(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
    });
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }

    await this.prisma.academicYear.delete({
      where: { id },
    });

    return { message: 'Academic year deleted successfully' };
  }

  // --- Term Operations ---

  async createTerm(dto: CreateTermDto) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    if (start < academicYear.startDate || end > academicYear.endDate) {
      throw new BadRequestException(
        `Term dates must fall within the academic year bounds: ${academicYear.startDate.toISOString().split('T')[0]} to ${academicYear.endDate.toISOString().split('T')[0]}`
      );
    }

    return this.prisma.term.create({
      data: {
        academicYearId: dto.academicYearId,
        name: dto.name,
        startDate: start,
        endDate: end,
        status: dto.status,
      },
    });
  }

  async findAllTerms(page = 1, limit = 10, academicYearId?: string) {
    const skip = (page - 1) * limit;
    const where = academicYearId ? { academicYearId } : {};

    const [terms, total] = await Promise.all([
      this.prisma.term.findMany({
        where,
        skip,
        take: limit,
        include: { academicYear: true },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.term.count({ where }),
    ]);

    return {
      data: terms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTermById(id: string) {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: { academicYear: true, courseClasses: true },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    return term;
  }

  async updateTerm(id: string, dto: UpdateTermDto) {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    let academicYear = term.academicYear;
    if (dto.academicYearId && dto.academicYearId !== term.academicYearId) {
      const ay = await this.prisma.academicYear.findUnique({
        where: { id: dto.academicYearId },
      });
      if (!ay) {
        throw new NotFoundException('Academic year not found');
      }
      academicYear = ay;
    }

    const start = dto.startDate ? new Date(dto.startDate) : term.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : term.endDate;
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    if (start < academicYear.startDate || end > academicYear.endDate) {
      throw new BadRequestException(
        `Term dates must fall within the academic year bounds: ${academicYear.startDate.toISOString().split('T')[0]} to ${academicYear.endDate.toISOString().split('T')[0]}`
      );
    }

    return this.prisma.term.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? start : undefined,
        endDate: dto.endDate ? end : undefined,
      },
    });
  }

  async deleteTerm(id: string) {
    const term = await this.prisma.term.findUnique({
      where: { id },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    await this.prisma.term.delete({
      where: { id },
    });

    return { message: 'Term deleted successfully' };
  }

  // --- Class Section Operations ---

  async createClassSection(dto: CreateClassSectionDto) {
    const [program, academicYear] = await Promise.all([
      this.prisma.program.findUnique({ where: { id: dto.programId } }),
      this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } }),
    ]);

    if (!program) {
      throw new NotFoundException('Program not found');
    }
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const existingCode = await this.prisma.classSection.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException('Class section code already exists');
    }

    return this.prisma.classSection.create({
      data: dto,
    });
  }

  async findAllClassSections(
    page = 1,
    limit = 10,
    academicYearId?: string,
    programId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (programId) where.programId = programId;

    const [sections, total] = await Promise.all([
      this.prisma.classSection.findMany({
        where,
        skip,
        take: limit,
        include: { academicYear: true, program: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.classSection.count({ where }),
    ]);

    return {
      data: sections,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findClassSectionById(id: string) {
    const section = await this.prisma.classSection.findUnique({
      where: { id },
      include: { academicYear: true, program: true, placements: true },
    });
    if (!section) {
      throw new NotFoundException('Class section not found');
    }
    return section;
  }

  async updateClassSection(id: string, dto: UpdateClassSectionDto) {
    const section = await this.prisma.classSection.findUnique({
      where: { id },
    });
    if (!section) {
      throw new NotFoundException('Class section not found');
    }

    if (dto.programId) {
      const program = await this.prisma.program.findUnique({
        where: { id: dto.programId },
      });
      if (!program) {
        throw new NotFoundException('Program not found');
      }
    }

    if (dto.academicYearId) {
      const academicYear = await this.prisma.academicYear.findUnique({
        where: { id: dto.academicYearId },
      });
      if (!academicYear) {
        throw new NotFoundException('Academic year not found');
      }
    }

    if (dto.code && dto.code !== section.code) {
      const existingCode = await this.prisma.classSection.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Class section code already exists');
      }
    }

    return this.prisma.classSection.update({
      where: { id },
      data: dto,
    });
  }

  async deleteClassSection(id: string) {
    const section = await this.prisma.classSection.findUnique({
      where: { id },
    });
    if (!section) {
      throw new NotFoundException('Class section not found');
    }

    await this.prisma.classSection.delete({
      where: { id },
    });

    return { message: 'Class section deleted successfully' };
  }

  // --- Course Class Operations ---

  async createCourseClass(dto: CreateCourseClassDto) {
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const existingCode = await this.prisma.courseClass.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException('Course class code already exists');
    }

    return this.prisma.courseClass.create({
      data: dto,
    });
  }

  async findAllCourseClasses(page = 1, limit = 10, termId?: string) {
    const skip = (page - 1) * limit;
    const where = termId ? { termId } : {};

    const [classes, total] = await Promise.all([
      this.prisma.courseClass.findMany({
        where,
        skip,
        take: limit,
        include: { term: { include: { academicYear: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.courseClass.count({ where }),
    ]);

    return {
      data: classes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findCourseClassById(id: string) {
    const cls = await this.prisma.courseClass.findUnique({
      where: { id },
      include: { term: { include: { academicYear: true } }, enrollments: true },
    });
    if (!cls) {
      throw new NotFoundException('Course class not found');
    }
    return cls;
  }

  async updateCourseClass(id: string, dto: UpdateCourseClassDto) {
    const cls = await this.prisma.courseClass.findUnique({
      where: { id },
    });
    if (!cls) {
      throw new NotFoundException('Course class not found');
    }

    if (dto.termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: dto.termId },
      });
      if (!term) {
        throw new NotFoundException('Term not found');
      }
    }

    if (dto.code && dto.code !== cls.code) {
      const existingCode = await this.prisma.courseClass.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Course class code already exists');
      }
    }

    return this.prisma.courseClass.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCourseClass(id: string) {
    const cls = await this.prisma.courseClass.findUnique({
      where: { id },
    });
    if (!cls) {
      throw new NotFoundException('Course class not found');
    }

    await this.prisma.courseClass.delete({
      where: { id },
    });

    return { message: 'Course class deleted successfully' };
  }
}
