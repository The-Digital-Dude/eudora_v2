import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSort } from '../common/sort.util';
import {
  ListPlacementRecommendationsQueryDto,
  PlacementDecisionDto,
} from './dto/placement-decision.dto';

const PLACEMENT_SORTABLE_FIELDS = ['status', 'createdAt'] as const;

@Injectable()
export class PlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecommendations(query: ListPlacementRecommendationsQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    // 500 comfortably covers "every recommendation" for callers that don't
    // paginate — this endpoint had none before, so that's still the
    // effective default.
    const limit = query.limit ? parseInt(query.limit, 10) : 500;
    const where = {
      ...(query.studentProfileId
        ? { studentProfileId: query.studentProfileId }
        : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            rationale: { contains: query.search, mode: 'insensitive' as const },
          }
        : {}),
    };
    const orderBy = resolveSort(
      query.sortBy,
      query.sortOrder,
      PLACEMENT_SORTABLE_FIELDS,
      'createdAt',
      'desc',
    );

    const [items, total] = await Promise.all([
      this.prisma.placementRecommendation.findMany({
        where,
        include: {
          recommendedClass: true,
          recommendedClassSection: true,
          studentProfile: { select: { id: true, fullName: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.placementRecommendation.count({ where }),
    ]);

    return { items, total, page, pageSize: limit };
  }

  async getRecommendationById(id: string) {
    const rec = await this.prisma.placementRecommendation.findUnique({
      where: { id },
      include: {
        recommendedClass: true,
        recommendedClassSection: true,
        assessmentAttempt: true,
      },
    });
    if (!rec) {
      throw new NotFoundException('Placement recommendation not found');
    }
    return rec;
  }

  async decideRecommendation(
    id: string,
    dto: PlacementDecisionDto,
    decidedByUserId: string,
  ) {
    await this.getRecommendationById(id);
    return this.prisma.placementRecommendation.update({
      where: { id },
      data: {
        status: dto.status,
        decidedById: decidedByUserId,
        decidedAt: new Date(),
      },
    });
  }

  /**
   * Week 2: map a completed diagnostic attempt's percentageScore (and/or
   * competency mastery) to a recommended Level via configured score bands,
   * and create a SUGGESTED PlacementRecommendation with a human-readable
   * rationale. Accepting one is also Week 2: creates a
   * StudentClassPlacement and advances the linked Lead. Not implemented
   * yet — scaffold only.
   */
  generateRecommendation(): never {
    throw new NotImplementedException(
      'Placement recommendation generation lands in Week 2 (score-band mapping).',
    );
  }
}
