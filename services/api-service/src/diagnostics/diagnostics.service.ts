import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiagnosticsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDiagnosticAttempts(studentProfileId?: string) {
    return this.prisma.assessmentAttempt.findMany({
      where: {
        ...(studentProfileId ? { studentProfileId } : {}),
        assignment: {
          assessment: {
            assessmentType: { code: 'DIAGNOSTIC' },
          },
        },
      },
      include: {
        assignment: { include: { assessment: true } },
        placementRecommendation: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getDiagnosticAttemptById(id: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id,
        assignment: {
          assessment: {
            assessmentType: { code: 'DIAGNOSTIC' },
          },
        },
      },
      include: {
        assignment: { include: { assessment: true } },
        responses: true,
        placementRecommendation: true,
      },
    });
    if (!attempt) {
      throw new NotFoundException('Diagnostic attempt not found');
    }
    return attempt;
  }

  /**
   * Week 2: schedule a DIAGNOSTIC assessment assignment/attempt for a
   * student or lead via the assessments engine. Not implemented yet —
   * scaffold only.
   */
  scheduleDiagnostic(): never {
    throw new NotImplementedException(
      'Diagnostic scheduling lands in Week 2 (wired into the assessments engine).',
    );
  }
}
