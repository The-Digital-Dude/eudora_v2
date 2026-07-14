import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';

@Injectable()
export class ParentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  async getChildren(userId: string) {
    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            studentProfile: {
              include: {
                placements: {
                  where: { isActive: true },
                  include: { classSection: true },
                },
                enrollments: true,
              },
            },
          },
        },
      },
    });

    if (!guardianProfile) {
      throw new NotFoundException('Guardian profile not found');
    }

    const childrenData = [];

    for (const rel of guardianProfile.students) {
      const child = rel.studentProfile;
      const classSection =
        child.placements.find((p) => p.isActive)?.classSection || null;
      const courseClassIds = child.enrollments.map((e) => e.courseClassId);

      // 1. Calculate Attendance Rate
      const totalAttendance = await this.prisma.dailyAttendance.count({
        where: { studentProfileId: child.id },
      });
      const presentAttendance = await this.prisma.dailyAttendance.count({
        where: {
          studentProfileId: child.id,
          status: { in: ['PRESENT', 'LATE'] },
        },
      });
      const attendanceRate =
        totalAttendance > 0
          ? Math.round((presentAttendance / totalAttendance) * 100)
          : 100;

      // 2. Calculate Pending Homework Count
      let pendingHomeworkCount = 0;
      if (courseClassIds.length > 0) {
        const homework = await this.prisma.homework.findMany({
          where: { courseClassId: { in: courseClassIds } },
          include: {
            submissions: {
              where: { studentProfileId: child.id },
            },
          },
        });
        pendingHomeworkCount = homework.filter(
          (hw) => hw.submissions.length === 0,
        ).length;
      }

      // 3. Find Latest Grade
      const latestGrade = await this.prisma.gradeBookEntry.findFirst({
        where: {
          studentProfileId: child.id,
          status: 'PUBLISHED',
        },
        orderBy: { assessedAt: 'desc' },
      });

      childrenData.push({
        studentProfileId: child.id,
        fullName: child.fullName,
        birthDate: child.birthDate,
        gender: child.gender,
        classSection: classSection
          ? {
              id: classSection.id,
              name: classSection.name,
              code: classSection.code,
            }
          : null,
        attendanceRate,
        pendingHomeworkCount,
        latestGrade: latestGrade
          ? {
              title: latestGrade.title,
              percentage: latestGrade.percentage,
              pointsEarned: latestGrade.pointsEarned,
              pointsPossible: latestGrade.pointsPossible,
              assessedAt: latestGrade.assessedAt,
            }
          : null,
      });
    }

    return childrenData;
  }

  async getChildTeachers(studentProfileId: string) {
    const placements = await this.prisma.studentClassPlacement.findMany({
      where: { studentProfileId, isActive: true },
      select: { classSectionId: true },
    });

    const classSectionIds = placements.map((p) => p.classSectionId);
    if (classSectionIds.length === 0) {
      return [];
    }

    const classTeachers = await this.prisma.classTeacher.findMany({
      where: { classSectionId: { in: classSectionIds } },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const teachersMap = new Map();
    for (const ct of classTeachers) {
      const u = ct.teacherProfile?.user;
      if (u) {
        teachersMap.set(u.id, {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          avatarUrl: u.avatarUrl,
          specialization: ct.teacherProfile.specialization,
        });
      }
    }

    return Array.from(teachersMap.values());
  }

  async getChildAttendance(studentProfileId: string) {
    const records = await this.prisma.dailyAttendance.findMany({
      where: { studentProfileId },
      orderBy: { date: 'desc' },
      include: {
        classSection: { select: { name: true } },
      },
    });

    return records;
  }

  async getChildHomework(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { enrollments: true },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const courseClassIds = student.enrollments.map((e) => e.courseClassId);
    if (courseClassIds.length === 0) {
      return [];
    }

    const homework = await this.prisma.homework.findMany({
      where: { courseClassId: { in: courseClassIds } },
      include: {
        courseClass: { select: { name: true } },
        submissions: {
          where: { studentProfileId },
          select: {
            id: true,
            status: true,
            submissionDate: true,
            feedback: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    return homework.map((hw) => ({
      id: hw.id,
      title: hw.title,
      description: hw.description,
      dueDate: hw.dueDate,
      pointsPossible: hw.maxPoints,
      courseName: hw.courseClass.name,
      submission: hw.submissions[0] || null,
    }));
  }

  async getChildGrades(studentProfileId: string) {
    const grades = await this.prisma.gradeBookEntry.findMany({
      where: {
        studentProfileId,
        status: 'PUBLISHED',
      },
      include: {
        courseClass: { select: { name: true } },
        term: { select: { name: true } },
      },
      orderBy: { assessedAt: 'desc' },
    });

    return grades;
  }

  /** Read-only active-learning summary for the parent portal. */
  async getChildLearning(studentProfileId: string) {
    const [lessonsCompleted, streak, experience, mastery] = await Promise.all([
      this.prisma.lessonAttempt.count({
        where: { studentProfileId, status: 'COMPLETED' },
      }),
      this.prisma.studentStreak.findUnique({ where: { studentProfileId } }),
      this.prisma.studentExperience.findUnique({ where: { studentProfileId } }),
      this.prisma.competencyMastery.findMany({
        where: { studentProfileId },
        include: { competency: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);

    return {
      lessonsCompleted,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalXp: experience?.totalXp ?? 0,
      level: experience?.level ?? 1,
      mastery: mastery.map((m) => ({
        competencyName: m.competency.name,
        masteryScore: m.masteryScore,
        status: m.status,
      })),
    };
  }

  async getInvoices(userId: string) {
    const familyId =
      await this.guardianAccessService.getGuardianFamilyId(userId);
    if (!familyId) {
      return [];
    }

    const invoices = await this.prisma.familyInvoice.findMany({
      where: { familyId },
      orderBy: { dueDate: 'desc' },
    });

    return invoices;
  }

  async getPayments(userId: string) {
    const familyId =
      await this.guardianAccessService.getGuardianFamilyId(userId);
    if (!familyId) {
      return [];
    }

    const payments = await this.prisma.familyPayment.findMany({
      where: { familyId },
      orderBy: { paymentDate: 'desc' },
    });

    return payments;
  }
}
