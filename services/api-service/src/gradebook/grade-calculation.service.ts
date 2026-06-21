import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GradeBookEntryStatus } from '@prisma/client';

@Injectable()
export class GradeCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  private mapScoreToGpa(score: number): { gpa: number; letter: string } {
    if (score >= 90) return { gpa: 4.0, letter: 'A' };
    if (score >= 80) return { gpa: 3.0, letter: 'B' };
    if (score >= 70) return { gpa: 2.0, letter: 'C' };
    if (score >= 60) return { gpa: 1.0, letter: 'D' };
    return { gpa: 0.0, letter: 'F' };
  }

  async calculateStudentAverages(studentProfileId: string, termId?: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const where: any = {
      studentProfileId,
      status: GradeBookEntryStatus.PUBLISHED,
    };
    if (termId) {
      where.termId = termId;
    }

    const entries = await this.prisma.gradeBookEntry.findMany({ where });

    if (entries.length === 0) {
      return {
        categoryAverages: {},
        termAverage: null,
        gpa: null,
        letterGrade: 'N/A',
        classRank: null,
        classPercentile: null,
      };
    }

    // 1. Group by category and calculate weighted category average
    const categoriesMap: { [cat: string]: { sumWeightedPercentage: number; sumWeight: number } } = {};
    for (const entry of entries) {
      if (entry.percentage === null) continue;
      const cat = entry.category || 'GENERAL';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { sumWeightedPercentage: 0, sumWeight: 0 };
      }
      categoriesMap[cat].sumWeightedPercentage += entry.percentage * entry.weight;
      categoriesMap[cat].sumWeight += entry.weight;
    }

    const categoryAverages: { [cat: string]: number } = {};
    let totalCategorySum = 0;
    let categoryCount = 0;

    for (const cat in categoriesMap) {
      const { sumWeightedPercentage, sumWeight } = categoriesMap[cat];
      if (sumWeight > 0) {
        const catAvg = sumWeightedPercentage / sumWeight;
        categoryAverages[cat] = Math.round(catAvg * 100) / 100;
        totalCategorySum += catAvg;
        categoryCount++;
      }
    }

    const termAverage = categoryCount > 0
      ? Math.round((totalCategorySum / categoryCount) * 100) / 100
      : null;

    const { gpa, letter: letterGrade } = termAverage !== null
      ? this.mapScoreToGpa(termAverage)
      : { gpa: null, letter: 'N/A' };

    // 2. Class rank & percentile calculations
    let classRank: number | null = null;
    let classPercentile: number | null = null;

    // Resolve classSectionId from student's active placement
    const placement = await this.prisma.studentClassPlacement.findFirst({
      where: { studentProfileId, isActive: true },
      select: { classSectionId: true },
    });

    if (placement && termAverage !== null) {
      const classSectionId = placement.classSectionId;

      // Find all students in this section
      const allPlacements = await this.prisma.studentClassPlacement.findMany({
        where: { classSectionId, isActive: true },
        select: { studentProfileId: true },
      });

      const peerAverages: { studentId: string; avg: number }[] = [];

      for (const peer of allPlacements) {
        const peerEntries = await this.prisma.gradeBookEntry.findMany({
          where: {
            studentProfileId: peer.studentProfileId,
            termId,
            status: GradeBookEntryStatus.PUBLISHED,
          },
        });

        if (peerEntries.length === 0) continue;

        const peerCatsMap: { [cat: string]: { sumWeightedPercentage: number; sumWeight: number } } = {};
        for (const entry of peerEntries) {
          if (entry.percentage === null) continue;
          const cat = entry.category || 'GENERAL';
          if (!peerCatsMap[cat]) {
            peerCatsMap[cat] = { sumWeightedPercentage: 0, sumWeight: 0 };
          }
          peerCatsMap[cat].sumWeightedPercentage += entry.percentage * entry.weight;
          peerCatsMap[cat].sumWeight += entry.weight;
        }

        let peerCatSum = 0;
        let peerCatCount = 0;

        for (const cat in peerCatsMap) {
          const { sumWeightedPercentage, sumWeight } = peerCatsMap[cat];
          if (sumWeight > 0) {
            peerCatSum += sumWeightedPercentage / sumWeight;
            peerCatCount++;
          }
        }

        if (peerCatCount > 0) {
          peerAverages.push({
            studentId: peer.studentProfileId,
            avg: peerCatSum / peerCatCount,
          });
        }
      }

      // Sort peers by average descending
      peerAverages.sort((a, b) => b.avg - a.avg);

      const rankIndex = peerAverages.findIndex((p) => p.studentId === studentProfileId);
      if (rankIndex !== -1) {
        classRank = rankIndex + 1;
        const totalWithGrades = peerAverages.length;
        classPercentile = totalWithGrades > 1
          ? Math.round(((totalWithGrades - classRank) / (totalWithGrades - 1)) * 100)
          : 100;
      }
    }

    return {
      categoryAverages,
      termAverage,
      gpa,
      letterGrade,
      classRank,
      classPercentile,
    };
  }

  async getClassGradebookSummary(courseClassId: string, termId?: string) {
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

    const summaries = [];
    for (const e of classInfo.enrollments) {
      const studentSum = await this.calculateStudentAverages(e.studentProfileId, termId);
      summaries.push({
        studentId: e.studentProfileId,
        fullName: e.studentProfile.fullName,
        ...studentSum,
      });
    }

    return summaries;
  }
}
