import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async findAllCampuses(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [campuses, total] = await Promise.all([
      this.prisma.campus.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campus.count(),
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

    await this.prisma.campus.delete({
      where: { id },
    });

    return { message: 'Campus deleted successfully' };
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

  async findAllPrograms(page = 1, limit = 10, campusId?: string) {
    const skip = (page - 1) * limit;
    const where = campusId ? { campusId } : {};

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
