import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSort } from '../common/sort.util';
import { GapStatus } from '@prisma/client';
import { ListGapsQueryDto, UpdateGapDto } from './dto/gap.dto';

const GAP_SORTABLE_FIELDS = ['severity', 'status', 'evidenceCount', 'createdAt'] as const;

@Injectable()
export class GapService {
  constructor(private readonly prisma: PrismaService) {}

  async listGaps(query: ListGapsQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    // 500 comfortably covers "every gap" for callers that don't paginate —
    // this endpoint had none before, so that's still the effective default.
    const limit = query.limit ? parseInt(query.limit, 10) : 500;
    const where = {
      ...(query.studentProfileId
        ? { studentProfileId: query.studentProfileId }
        : {}),
      ...(query.competencyId ? { competencyId: query.competencyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { rootCause: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const orderBy = resolveSort(
      query.sortBy,
      query.sortOrder,
      GAP_SORTABLE_FIELDS,
      'createdAt',
      'desc',
    );

    const [items, total] = await Promise.all([
      this.prisma.learningGap.findMany({
        where,
        include: {
          nextActions: true,
          studentProfile: { select: { id: true, fullName: true } },
          competency: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningGap.count({ where }),
    ]);

    return { items, total, page, pageSize: limit };
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
