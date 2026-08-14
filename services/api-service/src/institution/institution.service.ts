import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';

@Injectable()
export class InstitutionService {
  private readonly logger = new Logger(InstitutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Program Operations ---

  async createProgram(dto: CreateProgramDto) {
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
