import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class DashboardService {
  /**
   * `BatchSession.date` is a DATE column written at UTC midnight, so
   * matching it needs a UTC day — not the local-midnight value the
   * dailyAttendance queries alongside these use.
   */
  private utcDay(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  constructor(private readonly prisma: PrismaService) {}

  async getAdminSnapshot(targetDate: Date) {
    const days = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const dayOfWeek = days[targetDate.getDay()] as DayOfWeek;

    // Sessions happening today. Was a count of Timetable slots for this
    // weekday; Timetable is gone, and a real session is a better signal than
    // a recurrence rule anyway.
    const activeSlotsCount = await this.prisma.batchSession.count({
      where: {
        date: this.utcDay(targetDate),
        status: { notIn: ['CANCELLED', 'ENDED'] },
      },
    });

    // Attendance snapshot
    const totalStudents = await this.prisma.studentClassPlacement.count({
      where: { isActive: true },
    });

    const targetDateOnly = new Date(targetDate);
    targetDateOnly.setHours(0, 0, 0, 0);

    const markedCount = await this.prisma.dailyAttendance.count({
      where: {
        date: targetDateOnly,
      },
    });

    const absentCount = await this.prisma.dailyAttendance.count({
      where: {
        date: targetDateOnly,
        status: 'ABSENT',
      },
    });

    const unmarkedCount = Math.max(0, totalStudents - markedCount);

    // Homework snapshot
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dueToday = await this.prisma.homework.count({
      where: {
        dueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const ungradedSubmissions = await this.prisma.homeworkSubmission.count({
      where: {
        status: { in: ['SUBMITTED', 'LATE'] },
      },
    });

    // Gradebook snapshot
    const draftEntries = await this.prisma.gradeBookEntry.count({
      where: {
        status: 'DRAFT',
      },
    });

    return {
      timetableOccupancy: { activeSlotsCount },
      attendanceSnapshot: {
        markedCount,
        totalStudents,
        unmarkedCount,
        absentCount,
      },
      homeworkSnapshot: { dueToday, ungradedSubmissions },
      gradebookSnapshot: { draftEntries },
    };
  }

  async getTeacherSnapshot(userId: string, targetDate: Date) {
    const days = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const dayOfWeek = days[targetDate.getDay()] as DayOfWeek;

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: { classAssignments: true },
    });

    if (!teacherProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    const classSectionIds = teacherProfile.classAssignments.map(
      (ca) => ca.classSectionId,
    );

    // 1. todaySchedule
    // Real meetings today, not recurrence rules: sessions this teacher hosts
    // plus those belonging to a batch they lead.
    const todaySchedule = await this.prisma.batchSession.findMany({
      where: {
        date: this.utcDay(targetDate),
        status: { notIn: ['CANCELLED', 'ENDED'] },
        OR: [
          { teacherUserId: teacherProfile.userId },
          { batch: { leadTeacherProfileId: teacherProfile.id } },
        ],
      },
      include: {
        batch: true,
        moduleItem: { select: { id: true, title: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // 2. attendanceTasks
    const classSections = await this.prisma.classSection.findMany({
      where: {
        id: { in: classSectionIds },
        status: 'ACTIVE',
      },
      include: {
        placements: {
          where: { isActive: true },
        },
      },
    });

    const targetDateOnly = new Date(targetDate);
    targetDateOnly.setHours(0, 0, 0, 0);

    const dailyAttendanceToday = await this.prisma.dailyAttendance.findMany({
      where: {
        classSectionId: { in: classSectionIds },
        date: targetDateOnly,
      },
      select: { classSectionId: true },
    });

    const markedSectionIds = new Set(
      dailyAttendanceToday.map((da) => da.classSectionId),
    );

    const attendanceTasks = classSections
      .filter((cs) => cs.placements.length > 0 && !markedSectionIds.has(cs.id))
      .map((cs) => ({
        classSectionId: cs.id,
        name: cs.name,
        code: cs.code,
      }));

    // 3. ungradedSubmissions
    // Which batches this teacher is responsible for. Was derived from the
    // timetable slots they were rostered onto; now taken from the batches
    // they lead or whose course they teach — the same source the teacher
    // portal uses, so the two screens agree.
    const courseIds = (
      await this.prisma.courseTeacher.findMany({
        where: { teacherProfileId: teacherProfile.id },
        select: { courseId: true },
      })
    ).map((c) => c.courseId);

    const teacherBatches = await this.prisma.batch.findMany({
      where: {
        OR: [
          { leadTeacherProfileId: teacherProfile.id },
          ...(courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []),
        ],
      },
      select: { id: true },
    });

    const assignedBatchIds = teacherBatches.map((b) => b.id);

    const ungradedSubmissions = await this.prisma.homeworkSubmission.findMany({
      where: {
        status: { in: ['SUBMITTED', 'LATE'] },
        homework: {
          OR: [{ batchId: { in: assignedBatchIds } }, { recordedById: userId }],
        },
      },
      include: {
        studentProfile: true,
        homework: true,
      },
      orderBy: {
        submissionDate: 'desc',
      },
    });

    return {
      todaySchedule,
      attendanceTasks,
      ungradedSubmissions,
    };
  }

  async getStudentSnapshot(userId: string, targetDate: Date) {
    const days = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const dayOfWeek = days[targetDate.getDay()] as DayOfWeek;

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        placements: { where: { isActive: true } },
        enrollments: true,
      },
    });

    if (!studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const classSectionIds = studentProfile.placements.map(
      (p) => p.classSectionId,
    );
    const batchIds = studentProfile.enrollments.map((e) => e.batchId);

    // 1. todaySchedule
    // Real meetings today for the batches this student is enrolled in. The
    // ClassSection leg is gone: it made the schedule empty for any student
    // who arrived through checkout, since they never get a placement.
    const todaySchedule = await this.prisma.batchSession.findMany({
      where: {
        batchId: { in: batchIds },
        date: this.utcDay(targetDate),
        status: { notIn: ['CANCELLED', 'ENDED'] },
      },
      include: {
        batch: true,
        moduleItem: { select: { id: true, title: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // 2. pendingHomework
    let pendingHomework: any[] = [];
    if (batchIds.length > 0) {
      const pendingHomeworkRaw = await this.prisma.homework.findMany({
        where: {
          batchId: { in: batchIds },
          submissions: {
            none: {
              studentProfileId: studentProfile.id,
            },
          },
        },
        include: {
          batch: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      pendingHomework = pendingHomeworkRaw.map((hw) => ({
        id: hw.id,
        title: hw.title,
        dueDate: hw.dueDate,
        courseName: hw.batch?.name || 'N/A',
      }));
    }

    // 3. recentFeedback
    const recentFeedback = await this.prisma.homeworkSubmission.findMany({
      where: {
        studentProfileId: studentProfile.id,
        status: 'GRADED',
      },
      include: {
        homework: true,
      },
      orderBy: {
        gradedAt: 'desc',
      },
      take: 5,
    });

    // 4. upcomingAssessments
    const upcomingAssessmentsRaw =
      await this.prisma.assessmentAssignment.findMany({
        where: {
          studentProfileId: studentProfile.id,
          dueAt: { gte: new Date() },
          status: 'assigned',
        },
        include: {
          assessment: true,
        },
        orderBy: {
          dueAt: 'asc',
        },
      });

    const upcomingAssessments = upcomingAssessmentsRaw.map((aa) => ({
      id: aa.id,
      title: aa.assessment.title,
      dueAt: aa.dueAt,
    }));

    // 5. attendanceSummary
    const totalAttendance = await this.prisma.dailyAttendance.count({
      where: { studentProfileId: studentProfile.id },
    });
    const presentCount = await this.prisma.dailyAttendance.count({
      where: { studentProfileId: studentProfile.id, status: 'PRESENT' },
    });
    const lateCount = await this.prisma.dailyAttendance.count({
      where: { studentProfileId: studentProfile.id, status: 'LATE' },
    });
    const absentCount = await this.prisma.dailyAttendance.count({
      where: { studentProfileId: studentProfile.id, status: 'ABSENT' },
    });
    const excusedCount = await this.prisma.dailyAttendance.count({
      where: { studentProfileId: studentProfile.id, status: 'EXCUSED' },
    });

    // Null, not 100, when nothing has been recorded — see the same reasoning
    // in ParentService.getChildren. No history is not perfect attendance.
    const attendanceRate =
      totalAttendance > 0
        ? Math.round(((presentCount + lateCount) / totalAttendance) * 100)
        : null;

    const attendanceSummary = {
      attendanceRate,
      total: totalAttendance,
      breakdown: {
        PRESENT: presentCount,
        ABSENT: absentCount,
        LATE: lateCount,
        EXCUSED: excusedCount,
      },
    };

    return {
      todaySchedule,
      pendingHomework,
      recentFeedback,
      upcomingAssessments,
      attendanceSummary,
    };
  }

  async getGuardianSnapshot(userId: string, targetDate: Date) {
    const days = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const dayOfWeek = days[targetDate.getDay()] as DayOfWeek;

    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            studentProfile: {
              include: {
                placements: { where: { isActive: true } },
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

    const childrenProfiles = guardianProfile.students.map(
      (s) => s.studentProfile,
    );

    const childrenSnapshots = [];
    for (const child of childrenProfiles) {
      const classSectionIds = child.placements.map((p) => p.classSectionId);
      const batchIds = child.enrollments.map((e) => e.batchId);

      // 1. todaySchedule
      const todaySchedule = await this.prisma.batchSession.findMany({
        where: {
          batchId: { in: batchIds },
          date: this.utcDay(targetDate),
          status: { notIn: ['CANCELLED', 'ENDED'] },
        },
        include: {
          batch: true,
          moduleItem: { select: { id: true, title: true } },
        },
        orderBy: { startTime: 'asc' },
      });

      // 2. recentGrades (GradeBookEntry)
      const recentGrades = await this.prisma.gradeBookEntry.findMany({
        where: {
          studentProfileId: child.id,
          status: 'PUBLISHED',
        },
        orderBy: {
          assessedAt: 'desc',
        },
        take: 5,
      });

      // 3. pendingHomeworkCount
      let pendingHomeworkCount = 0;
      if (batchIds.length > 0) {
        const allHomework = await this.prisma.homework.findMany({
          where: {
            batchId: { in: batchIds },
          },
          include: {
            submissions: {
              where: { studentProfileId: child.id },
            },
          },
        });
        pendingHomeworkCount = allHomework.filter(
          (h) => h.submissions.length === 0,
        ).length;
      }

      childrenSnapshots.push({
        studentId: child.id,
        fullName: child.fullName,
        todaySchedule,
        recentGrades,
        pendingHomeworkCount,
      });
    }

    return {
      children: childrenSnapshots,
    };
  }
}
