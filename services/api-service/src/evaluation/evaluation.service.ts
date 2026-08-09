import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import {
  CreateConceptDto,
  UpdateConceptDto,
  CreateCompetencyDto,
} from './dto/curriculum.dto';
import { CreateRubricDto } from './dto/rubric.dto';
import { RecordEvidenceDto, CreateAssessmentDto } from './dto/assessment.dto';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

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
      include: {
        competencies: true,
      },
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

  // ─── Competency Operations ───────────────────────────────────────────────────

  async createCompetency(dto: CreateCompetencyDto) {
    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
    });
    if (!concept) {
      throw new NotFoundException('Parent concept not found');
    }
    return this.prisma.competency.create({
      data: dto,
    });
  }

  async getCompetencies(conceptId?: string) {
    return this.prisma.competency.findMany({
      where: conceptId ? { conceptId } : {},
      orderBy: { name: 'asc' },
    });
  }

  // ─── Rubric Operations ───────────────────────────────────────────────────────

  async createRubric(dto: CreateRubricDto) {
    const competency = await this.prisma.competency.findUnique({
      where: { id: dto.competencyId },
    });
    if (!competency) {
      throw new NotFoundException('Competency not found');
    }

    // Check if rubric already exists for this competency
    const existing = await this.prisma.rubric.findFirst({
      where: { competencyId: dto.competencyId },
    });
    if (existing) {
      throw new BadRequestException(
        'A rubric already exists for this competency',
      );
    }

    // Create Rubric, criteria, and levels in a single transaction
    return this.prisma.$transaction(async (tx) => {
      const rubric = await tx.rubric.create({
        data: {
          competencyId: dto.competencyId,
          name: dto.name,
          description: dto.description,
        },
      });

      for (const critDto of dto.criteria) {
        const criterion = await tx.rubricCriterion.create({
          data: {
            rubricId: rubric.id,
            title: critDto.title,
            description: critDto.description,
            weight: critDto.weight ?? 1.0,
          },
        });

        for (const lvlDto of critDto.levels) {
          await tx.rubricLevel.create({
            data: {
              criterionId: criterion.id,
              level: lvlDto.level,
              title: lvlDto.title,
              description: lvlDto.description,
              score: lvlDto.score,
            },
          });
        }
      }

      return tx.rubric.findUnique({
        where: { id: rubric.id },
        include: {
          criteria: {
            include: {
              levels: true,
            },
          },
        },
      });
    });
  }

  async getRubricByCompetency(competencyId: string) {
    const rubric = await this.prisma.rubric.findFirst({
      where: { competencyId },
      include: {
        criteria: {
          include: {
            levels: true,
          },
        },
      },
    });
    if (!rubric) {
      throw new NotFoundException('Rubric not found for this competency');
    }
    return rubric;
  }

  // ─── Evidence Operations ─────────────────────────────────────────────────────

  async recordEvidence(dto: RecordEvidenceDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const competency = await this.prisma.competency.findUnique({
      where: { id: dto.competencyId },
    });
    if (!competency) {
      throw new NotFoundException('Competency not found');
    }

    if (dto.homeworkSubmissionId) {
      const submission = await this.prisma.homeworkSubmission.findUnique({
        where: { id: dto.homeworkSubmissionId },
      });
      if (!submission) {
        throw new NotFoundException('Homework submission not found');
      }
    }

    return this.prisma.assessmentEvidence.create({
      data: {
        studentProfileId: dto.studentProfileId,
        competencyId: dto.competencyId,
        homeworkSubmissionId: dto.homeworkSubmissionId || null,
        sourceType: dto.sourceType,
        metadata: dto.metadata || {},
      },
    });
  }

  async getEvidence(studentProfileId?: string, competencyId?: string) {
    return this.prisma.assessmentEvidence.findMany({
      where: {
        studentProfileId: studentProfileId || undefined,
        competencyId: competencyId || undefined,
      },
      include: {
        studentProfile: true,
        competency: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getEvidenceById(id: string) {
    const evidence = await this.prisma.assessmentEvidence.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        competency: true,
        homeworkSubmission: true,
      },
    });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }
    return evidence;
  }

  // ─── Assessment & Mastery Engine Operations ──────────────────────────────────

  async evaluateEvidence(dto: CreateAssessmentDto, evaluatorId: string) {
    const evidence = await this.prisma.assessmentEvidence.findUnique({
      where: { id: dto.evidenceId },
    });
    if (!evidence) {
      throw new NotFoundException('Assessment evidence not found');
    }

    const rubric = await this.prisma.rubric.findUnique({
      where: { id: dto.rubricId },
      include: {
        criteria: {
          include: {
            levels: true,
          },
        },
      },
    });
    if (!rubric) {
      throw new NotFoundException('Rubric not found');
    }

    // Compute the weighted average score based on selected ratings
    let totalWeightedScore = 0;
    let totalWeight = 0;

    const criterionMap = new Map(rubric.criteria.map((c) => [c.id, c]));

    // Validate that all ratings have valid selected levels for the criteria
    for (const ratingInput of dto.ratings) {
      const criterion = criterionMap.get(ratingInput.criterionId);
      if (!criterion) {
        throw new BadRequestException(
          `Criterion with ID ${ratingInput.criterionId} does not belong to this rubric`,
        );
      }

      const matchingLevel = criterion.levels.find(
        (l) => l.level === ratingInput.selectedLevel,
      );
      if (!matchingLevel) {
        throw new BadRequestException(
          `Level ${ratingInput.selectedLevel} is not valid for criterion ${criterion.title}`,
        );
      }

      totalWeightedScore += matchingLevel.score * criterion.weight;
      totalWeight += criterion.weight;
    }

    if (totalWeight === 0) {
      throw new BadRequestException(
        'Total weight of evaluated criteria cannot be zero',
      );
    }

    const overallScore = totalWeightedScore / totalWeight;

    // Save in transaction
    const assessment = await this.prisma.$transaction(async (tx) => {
      const rubricAss = await tx.rubricAssessment.create({
        data: {
          rubricId: dto.rubricId,
          evidenceId: dto.evidenceId,
          evaluatorId,
          overallScore,
          feedback: dto.feedback,
        },
      });

      for (const ratingInput of dto.ratings) {
        await tx.rubricCriterionRating.create({
          data: {
            assessmentId: rubricAss.id,
            criterionId: ratingInput.criterionId,
            selectedLevel: ratingInput.selectedLevel,
            comments: ratingInput.comments,
          },
        });
      }

      return rubricAss;
    });

    // Update the student's mastery score and confidence metrics
    await this.updateMastery(
      evidence.studentProfileId,
      evidence.competencyId,
      overallScore,
    );

    return this.prisma.rubricAssessment.findUnique({
      where: { id: assessment.id },
      include: {
        ratings: true,
        rubric: true,
        evidence: true,
      },
    });
  }

  async getAssessmentById(id: string, user: CurrentUserDto) {
    const assessment = await this.prisma.rubricAssessment.findUnique({
      where: { id },
      include: {
        ratings: {
          include: {
            criterion: true,
          },
        },
        rubric: true,
        evidence: true,
        evaluator: true,
      },
    });
    if (!assessment) {
      throw new NotFoundException('Rubric assessment not found');
    }
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      assessment.evidence.studentProfileId,
    );
    return assessment;
  }

  /**
   * Mastery Engine recalculation
   * Decaying weighted average: Mastery(t) = 0.5 * Score(t) + 0.5 * Mastery(t-1)
   * Confidence level: Confidence = 1 - e^(-0.5 * N)
   */
  private async updateMastery(
    studentProfileId: string,
    competencyId: string,
    newScore: number,
  ) {
    const previousMastery = await this.prisma.competencyMastery.findUnique({
      where: {
        studentProfileId_competencyId: {
          studentProfileId,
          competencyId,
        },
      },
    });

    const isFirstAssessment = !previousMastery;
    const previousScore = previousMastery?.masteryScore ?? 0.0;
    const alpha = 0.5;

    const masteryScore = isFirstAssessment
      ? newScore
      : alpha * newScore + (1 - alpha) * previousScore;

    // Retrieve count of completed assessments for confidence calculation
    const assessmentCount = await this.prisma.rubricAssessment.count({
      where: {
        evidence: {
          studentProfileId,
          competencyId,
        },
      },
    });

    const confidence = 1 - Math.exp(-0.5 * assessmentCount);

    return this.prisma.competencyMastery.upsert({
      where: {
        studentProfileId_competencyId: {
          studentProfileId,
          competencyId,
        },
      },
      update: {
        masteryScore,
        confidence,
      },
      create: {
        studentProfileId,
        competencyId,
        masteryScore,
        confidence,
      },
    });
  }

  async getStudentMasterySheet(studentProfileId: string, user: CurrentUserDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      studentProfileId,
    );

    return this.prisma.competencyMastery.findMany({
      where: { studentProfileId },
      include: {
        competency: {
          include: {
            concept: true,
          },
        },
      },
      orderBy: {
        competency: {
          name: 'asc',
        },
      },
    });
  }

  async getStudentCompetencyHistory(
    studentProfileId: string,
    competencyId: string,
    user: CurrentUserDto,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      studentProfileId,
    );

    const competency = await this.prisma.competency.findUnique({
      where: { id: competencyId },
    });
    if (!competency) {
      throw new NotFoundException('Competency not found');
    }

    return this.prisma.rubricAssessment.findMany({
      where: {
        evidence: {
          studentProfileId,
          competencyId,
        },
      },
      include: {
        evidence: true,
        ratings: true,
      },
      orderBy: {
        createdAt: 'asc', // chronological order to trace progress
      },
    });
  }
}
