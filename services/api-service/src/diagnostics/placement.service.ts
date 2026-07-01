import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListPlacementRecommendationsQueryDto,
  PlacementDecisionDto,
} from './dto/placement-decision.dto';

@Injectable()
export class PlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecommendations(query: ListPlacementRecommendationsQueryDto) {
    return this.prisma.placementRecommendation.findMany({
      where: {
        ...(query.studentProfileId
          ? { studentProfileId: query.studentProfileId }
          : {}),
        ...(query.leadId ? { leadId: query.leadId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { recommendedLevel: true, recommendedClassSection: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecommendationById(id: string) {
    const rec = await this.prisma.placementRecommendation.findUnique({
      where: { id },
      include: {
        recommendedLevel: true,
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
