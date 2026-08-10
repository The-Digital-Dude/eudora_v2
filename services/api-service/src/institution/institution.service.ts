import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampusDto, UpdateCampusDto } from './dto/campus.dto';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Campus Operations ---

  async createCampus(dto: CreateCampusDto) {
    const existing = await this.prisma.campus.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Campus name already exists');
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
}
