import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryStatus } from '@prisma/client';

/**
 * Pure threshold mapping from a raw score/confidence pair to a staged
 * MasteryStatus. Never returns MASTERED on a single high score with low
 * confidence — see completion-plan-2026-07-01.md WS-C.
 */
export function deriveStatus(
  normalizedScore: number,
  confidence: number,
  hasEvidence: boolean,
): MasteryStatus {
  if (!hasEvidence) {
    return MasteryStatus.NOT_STARTED;
  }
  if (normalizedScore < 0.4) {
    return MasteryStatus.INTRODUCED;
  }
  if (normalizedScore < 0.7) {
    return MasteryStatus.DEVELOPING;
  }
  if (normalizedScore < 0.9) {
    return confidence >= 0.6
      ? MasteryStatus.NEAR_MASTERY
      : MasteryStatus.DEVELOPING;
  }
  return confidence >= 0.8
    ? MasteryStatus.MASTERED
    : MasteryStatus.NEAR_MASTERY;
}

@Injectable()
export class MasteryService {
  constructor(private readonly prisma: PrismaService) {}

  async getMasteryHistory(studentProfileId: string, competencyId?: string) {
    return this.prisma.masteryStatusChange.findMany({
      where: {
        studentProfileId,
        ...(competencyId ? { competencyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Week 2: wire deriveStatus() into EvaluationService.updateMastery() so
   * every mastery recalculation writes a MasteryStatusChange + AuditLog row
   * when the derived status changes. Not implemented yet — scaffold only.
   */
  recordStatusChangeIfNeeded(): never {
    throw new NotImplementedException(
      'Mastery status-change recording lands in Week 2 (wired into EvaluationService.updateMastery()).',
    );
  }
}
