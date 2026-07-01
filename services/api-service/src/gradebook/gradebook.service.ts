import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GradeBookEntry,
  GradeSourceType,
  GradeBookEntryStatus,
} from '@prisma/client';
import {
  CreateManualGradeDto,
  UpdateGradeEntryDto,
  BulkUpsertGradesDto,
} from './dto/gradebook.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class GradebookService {
  constructor(private readonly prisma: PrismaService) {}

  async createManualGrade(
    dto: CreateManualGradeDto,
    creatorUserId: string,
  ): Promise<GradeBookEntry> {
    const {
      studentProfileId,
      courseClassId,
      classSectionId,
      termId,
      title,
      category,
      pointsEarned,
      pointsPossible,
      weight,
      status,
      notes,
      sourceId,
    } = dto;

    if (pointsPossible <= 0) {
      throw new BadRequestException(
        'Points possible must be greater than zero',
      );
    }

    const percentage =
      pointsEarned !== undefined && pointsEarned !== null
        ? (pointsEarned / pointsPossible) * 100
        : null;

    const finalSourceId = sourceId || randomUUID();

    // Verify student profile exists
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.prisma.gradeBookEntry.upsert({
      where: {
        studentProfileId_sourceType_sourceId: {
          studentProfileId,
          sourceType: GradeSourceType.MANUAL,
          sourceId: finalSourceId,
        },
      },
      create: {
        studentProfileId,
        courseClassId,
        classSectionId,
        termId,
        sourceType: GradeSourceType.MANUAL,
        sourceId: finalSourceId,
        title,
        category: category || 'GENERAL',
        pointsEarned,
        pointsPossible,
        percentage,
        weight: weight ?? 1.0,
        status: status ?? GradeBookEntryStatus.DRAFT,
        notes,
        createdById: creatorUserId,
        assessedAt: new Date(),
      },
      update: {
        courseClassId,
        classSectionId,
        termId,
        title,
        category: category || 'GENERAL',
        pointsEarned,
        pointsPossible,
        percentage,
        weight: weight ?? 1.0,
        status: status ?? GradeBookEntryStatus.DRAFT,
        notes,
        updatedById: creatorUserId,
      },
    });
  }

  async updateGradeEntry(
    id: string,
    dto: UpdateGradeEntryDto,
    updaterUserId: string,
  ): Promise<GradeBookEntry> {
    const entry = await this.prisma.gradeBookEntry.findUnique({
      where: { id },
    });
    if (!entry) {
      throw new NotFoundException('Gradebook entry not found');
    }

    const pointsEarned =
      dto.pointsEarned !== undefined ? dto.pointsEarned : entry.pointsEarned;
    const pointsPossible =
      dto.pointsPossible !== undefined
        ? dto.pointsPossible
        : entry.pointsPossible;

    if (pointsPossible !== null && pointsPossible <= 0) {
      throw new BadRequestException(
        'Points possible must be greater than zero',
      );
    }

    const percentage =
      pointsEarned !== null && pointsEarned !== undefined && pointsPossible
        ? (pointsEarned / pointsPossible) * 100
        : null;

    return this.prisma.gradeBookEntry.update({
      where: { id },
      data: {
        pointsEarned,
        pointsPossible,
        percentage,
        status: dto.status ?? entry.status,
        weight: dto.weight ?? entry.weight,
        notes: dto.notes !== undefined ? dto.notes : entry.notes,
        updatedById: updaterUserId,
      },
    });
  }

  async deleteGradeEntry(id: string): Promise<GradeBookEntry> {
    const entry = await this.prisma.gradeBookEntry.findUnique({
      where: { id },
    });
    if (!entry) {
      throw new NotFoundException('Gradebook entry not found');
    }
    return this.prisma.gradeBookEntry.delete({ where: { id } });
  }

  async bulkUpsertGrades(
    dto: BulkUpsertGradesDto,
    creatorUserId: string,
  ): Promise<GradeBookEntry[]> {
    const results: GradeBookEntry[] = [];
    const sourceIdForBulk = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.entries) {
        const {
          studentProfileId,
          courseClassId,
          classSectionId,
          termId,
          title,
          category,
          pointsEarned,
          pointsPossible,
          weight,
          status,
          notes,
          sourceId,
        } = entry;

        if (pointsPossible <= 0) {
          throw new BadRequestException(
            'Points possible must be greater than zero',
          );
        }

        const percentage =
          pointsEarned !== undefined && pointsEarned !== null
            ? (pointsEarned / pointsPossible) * 100
            : null;

        const finalSourceId = sourceId || sourceIdForBulk;

        const upserted = await tx.gradeBookEntry.upsert({
          where: {
            studentProfileId_sourceType_sourceId: {
              studentProfileId,
              sourceType: GradeSourceType.MANUAL,
              sourceId: finalSourceId,
            },
          },
          create: {
            studentProfileId,
            courseClassId,
            classSectionId,
            termId,
            sourceType: GradeSourceType.MANUAL,
            sourceId: finalSourceId,
            title,
            category: category || 'GENERAL',
            pointsEarned,
            pointsPossible,
            percentage,
            weight: weight ?? 1.0,
            status: status ?? GradeBookEntryStatus.DRAFT,
            notes,
            createdById: creatorUserId,
            assessedAt: new Date(),
          },
          update: {
            courseClassId,
            classSectionId,
            termId,
            title,
            category: category || 'GENERAL',
            pointsEarned,
            pointsPossible,
            percentage,
            weight: weight ?? 1.0,
            status: status ?? GradeBookEntryStatus.DRAFT,
            notes,
            updatedById: creatorUserId,
          },
        });
        results.push(upserted);
      }
    });

    return results;
  }

  async upsertFromHomeworkSubmission(
    submissionId: string,
    pointsEarned: number,
    maxPoints: number,
    assessedAt: Date,
  ): Promise<GradeBookEntry> {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: {
        homework: {
          include: {
            courseClass: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Homework submission not found');
    }

    const percentage = maxPoints > 0 ? (pointsEarned / maxPoints) * 100 : null;

    const placement = await this.prisma.studentClassPlacement.findFirst({
      where: { studentProfileId: submission.studentProfileId, isActive: true },
      select: { classSectionId: true },
    });

    return this.prisma.gradeBookEntry.upsert({
      where: {
        studentProfileId_sourceType_sourceId: {
          studentProfileId: submission.studentProfileId,
          sourceType: GradeSourceType.HOMEWORK_SUBMISSION,
          sourceId: submissionId,
        },
      },
      create: {
        studentProfileId: submission.studentProfileId,
        courseClassId: submission.homework.courseClassId,
        classSectionId: placement?.classSectionId || null,
        termId: submission.homework.courseClass.termId,
        sourceType: GradeSourceType.HOMEWORK_SUBMISSION,
        sourceId: submissionId,
        title: submission.homework.title,
        category: 'HOMEWORK',
        pointsEarned,
        pointsPossible: maxPoints,
        percentage,
        weight: 1.0,
        status: GradeBookEntryStatus.PUBLISHED,
        assessedAt,
      },
      update: {
        courseClassId: submission.homework.courseClassId,
        classSectionId: placement?.classSectionId || null,
        termId: submission.homework.courseClass.termId,
        title: submission.homework.title,
        pointsEarned,
        pointsPossible: maxPoints,
        percentage,
        status: GradeBookEntryStatus.PUBLISHED,
        assessedAt,
      },
    });
  }

  async upsertFromAssessmentAttempt(
    attemptId: string,
    pointsEarned: number,
    maxPoints: number,
    assessedAt: Date,
  ): Promise<GradeBookEntry> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: {
            assessment: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }

    const percentage = maxPoints > 0 ? (pointsEarned / maxPoints) * 100 : null;

    return this.prisma.gradeBookEntry.upsert({
      where: {
        studentProfileId_sourceType_sourceId: {
          studentProfileId: attempt.studentProfileId,
          sourceType: GradeSourceType.ASSESSMENT_ATTEMPT,
          sourceId: attemptId,
        },
      },
      create: {
        studentProfileId: attempt.studentProfileId,
        courseClassId: null,
        classSectionId: attempt.assignment.classSectionId,
        termId: attempt.assignment.assessment.termId,
        sourceType: GradeSourceType.ASSESSMENT_ATTEMPT,
        sourceId: attemptId,
        title: attempt.assignment.assessment.title,
        category: 'ASSESSMENT',
        pointsEarned,
        pointsPossible: maxPoints,
        percentage,
        weight: 1.0,
        status: GradeBookEntryStatus.PUBLISHED,
        assessedAt,
      },
      update: {
        classSectionId: attempt.assignment.classSectionId,
        termId: attempt.assignment.assessment.termId,
        title: attempt.assignment.assessment.title,
        pointsEarned,
        pointsPossible: maxPoints,
        percentage,
        status: GradeBookEntryStatus.PUBLISHED,
        assessedAt,
      },
    });
  }

  async getGradebookForClass(courseClassId: string, termId?: string) {
    const where: any = { courseClassId };
    if (termId) {
      where.termId = termId;
    }

    const classInfo = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
      include: {
        enrollments: {
          include: {
            studentProfile: true,
          },
        },
      },
    });

    if (!classInfo) {
      throw new NotFoundException('Course class not found');
    }

    const entries = await this.prisma.gradeBookEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return {
      students: classInfo.enrollments.map((e) => e.studentProfile),
      entries,
    };
  }

  async getGradebookForClassSection(classSectionId: string, termId?: string) {
    const placements = await this.prisma.studentClassPlacement.findMany({
      where: { classSectionId, isActive: true },
      include: { studentProfile: true },
    });

    const studentIds = placements.map((p) => p.studentProfileId);
    const where: any = {
      studentProfileId: { in: studentIds },
    };
    if (termId) {
      where.termId = termId;
    }

    const entries = await this.prisma.gradeBookEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return {
      students: placements.map((p) => p.studentProfile),
      entries,
    };
  }

  async getStudentGrades(
    studentProfileId: string,
    termId?: string,
  ): Promise<GradeBookEntry[]> {
    const where: any = {
      studentProfileId,
      status: GradeBookEntryStatus.PUBLISHED,
    };
    if (termId) {
      where.termId = termId;
    }

    return this.prisma.gradeBookEntry.findMany({
      where,
      orderBy: { assessedAt: 'desc' },
    });
  }

  async syncAllSourceGrades() {
    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: { status: 'GRADED', pointsEarned: { not: null } },
      include: { homework: true },
    });

    let homeworkSyncCount = 0;
    for (const sub of submissions) {
      try {
        await this.upsertFromHomeworkSubmission(
          sub.id,
          sub.pointsEarned!,
          sub.homework.maxPoints,
          sub.gradedAt || sub.updatedAt,
        );
        homeworkSyncCount++;
      } catch (err) {
        console.error(`Failed to sync homework submission ${sub.id}:`, err);
      }
    }

    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        resultStatus: 'marked',
        rawScore: { not: null },
        maxScore: { not: null },
      },
    });

    let assessmentSyncCount = 0;
    for (const att of attempts) {
      try {
        await this.upsertFromAssessmentAttempt(
          att.id,
          att.rawScore!,
          att.maxScore!,
          att.updatedAt,
        );
        assessmentSyncCount++;
      } catch (err) {
        console.error(`Failed to sync assessment attempt ${att.id}:`, err);
      }
    }

    return {
      homeworkSyncCount,
      assessmentSyncCount,
    };
  }
}
