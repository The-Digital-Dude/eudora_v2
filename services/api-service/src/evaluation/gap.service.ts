import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GapStatus } from '@prisma/client';
import { ListGapsQueryDto, UpdateGapDto } from './dto/gap.dto';

@Injectable()
export class GapService {
  constructor(private readonly prisma: PrismaService) {}

  async listGaps(query: ListGapsQueryDto) {
    return this.prisma.learningGap.findMany({
      where: {
        ...(query.studentProfileId
          ? { studentProfileId: query.studentProfileId }
          : {}),
        ...(query.competencyId ? { competencyId: query.competencyId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        nextActions: true,
        studentProfile: { select: { id: true, fullName: true } },
        competency: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGapById(id: string) {
    const gap = await this.prisma.learningGap.findUnique({
      where: { id },
      include: {
        nextActions: true,
        studentProfile: { select: { id: true, fullName: true } },
        competency: { select: { id: true, name: true } },
      },
    });
    if (!gap) {
      throw new NotFoundException('Learning gap not found');
    }
    return gap;
  }

  async updateGapStatus(id: string, dto: UpdateGapDto) {
    await this.getGapById(id);
    return this.prisma.learningGap.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: dto.status === GapStatus.RESOLVED ? new Date() : null,
      },
    });
  }

  /**
   * Week 2: scan StudentResponse for repeated incorrect answers per
   * competency and raise/update a LearningGap with severity + rootCause.
   * Not implemented yet — scaffold only.
   */
  detectGaps(): never {
    throw new NotImplementedException(
      'Gap detection scanning lands in Week 2.',
    );
  }
}
