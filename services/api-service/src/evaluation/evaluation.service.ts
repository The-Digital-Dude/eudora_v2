import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConceptDto, UpdateConceptDto } from './dto/curriculum.dto';

@Injectable()
export class EvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Concept Operations ──────────────────────────────────────────────────────

  async createConcept(dto: CreateConceptDto) {
    const existing = await this.prisma.concept.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Concept with this name already exists');
    }
    return this.prisma.concept.create({
      data: dto,
    });
  }

  async getConcepts(courseId?: string) {
    return this.prisma.concept.findMany({
      where: courseId ? { courseId } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  }

  async getConceptById(id: string) {
    const concept = await this.prisma.concept.findUnique({
      where: { id },
    });
    if (!concept) {
      throw new NotFoundException('Concept not found');
    }
    return concept;
  }

  async updateConcept(id: string, dto: UpdateConceptDto) {
    const concept = await this.prisma.concept.findUnique({ where: { id } });
    if (!concept) {
      throw new NotFoundException('Concept not found');
    }
    return this.prisma.concept.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.passThresholdPercent !== undefined
          ? { passThresholdPercent: dto.passThresholdPercent }
          : {}),
      },
    });
  }
}
