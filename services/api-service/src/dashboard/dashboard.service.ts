import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class DashboardService {
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

    // Timetable occupancy
    const activeSlotsCount = await this.prisma.timetableSlot.count({
      where: {
        dayOfWeek,
        status: 'ACTIVE',
        timetable: {
          status: { not: 'ARCHIVED' },
        },
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
    const todaySchedule = await this.prisma.timetableSlot.findMany({
      where: {
        teacherProfileId: teacherProfile.id,
        dayOfWeek,
        status: 'ACTIVE',
        timetable: {
          status: { not: 'ARCHIVED' },
        },
      },
      include: {
        courseClass: true,
        classSection: true,
      },
      orderBy: {
        startTimeMinutes: 'asc',
      },
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
    const teacherSlots = await this.prisma.timetableSlot.findMany({
      where: {
        teacherProfileId: teacherProfile.id,
        status: 'ACTIVE',
      },
      select: { courseClassId: true },
    });

    const assignedCourseClassIds = Array.from(
      new Set(teacherSlots.map((s) => s.courseClassId).filter(Boolean)),
    ) as string[];

    const ungradedSubmissions = await this.prisma.homeworkSubmission.findMany({
      where: {
        status: { in: ['SUBMITTED', 'LATE'] },
        homework: {
          OR: [
            { courseClassId: { in: assignedCourseClassIds } },
            { recordedById: userId },
          ],
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
    const courseClassIds = studentProfile.enrollments.map(
      (e) => e.courseClassId,
    );

    // 1. todaySchedule
    const todaySchedule = await this.prisma.timetableSlot.findMany({
      where: {
        classSectionId: { in: classSectionIds },
        courseClassId: { in: courseClassIds },
        dayOfWeek,
        status: 'ACTIVE',
        timetable: {
          status: { not: 'ARCHIVED' },
        },
      },
      include: {
        courseClass: true,
        teacherProfile: true,
      },
      orderBy: {
        startTimeMinutes: 'asc',
      },
    });

    // 2. pendingHomework
    let pendingHomework: any[] = [];
    if (courseClassIds.length > 0) {
      const pendingHomeworkRaw = await this.prisma.homework.findMany({
        where: {
          courseClassId: { in: courseClassIds },
          submissions: {
            none: {
              studentProfileId: studentProfile.id,
            },
          },
        },
        include: {
          courseClass: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      pendingHomework = pendingHomeworkRaw.map((hw) => ({
        id: hw.id,
        title: hw.title,
        dueDate: hw.dueDate,
        courseName: hw.courseClass?.name || 'N/A',
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
    const upcomingAssessmentsRaw = await this.prisma.assessmentAssignment.findMany({
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

    const attendanceRate = totalAttendance > 0 
      ? Math.round(((presentCount + lateCount) / totalAttendance) * 100) 
      : 100;

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
      const courseClassIds = child.enrollments.map((e) => e.courseClassId);

      // 1. todaySchedule
      const todaySchedule = await this.prisma.timetableSlot.findMany({
        where: {
          classSectionId: { in: classSectionIds },
          courseClassId: { in: courseClassIds },
          dayOfWeek,
          status: 'ACTIVE',
          timetable: {
            status: { not: 'ARCHIVED' },
          },
        },
        include: {
          courseClass: true,
        },
        orderBy: {
          startTimeMinutes: 'asc',
        },
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
      if (courseClassIds.length > 0) {
        const allHomework = await this.prisma.homework.findMany({
          where: {
            courseClassId: { in: courseClassIds },
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
