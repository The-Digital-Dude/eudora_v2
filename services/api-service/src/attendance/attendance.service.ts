import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordDailyAttendanceDto } from './dto/record-daily-attendance.dto';
import {
  CreateSessionDto,
  RecordSessionAttendanceDto,
} from './dto/record-session-attendance.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Daily Attendance ───────────────────────────────────────────────────────

  async recordDailyAttendance(dto: RecordDailyAttendanceDto, recordedByUserId?: string) {
    const section = await this.prisma.classSection.findUnique({
      where: { id: dto.classSectionId },
      include: { placements: true },
    });
    if (!section) {
      throw new NotFoundException('Class section not found');
    }

    const validStudentIds = new Set(section.placements.map((p) => p.studentProfileId));
    const targetDate = new Date(dto.date);

    // Validate date format
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    // Run in transaction to ensure all or nothing
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const record of dto.records) {
        if (!validStudentIds.has(record.studentProfileId)) {
          throw new BadRequestException(
            `Student with ID ${record.studentProfileId} is not placed in Class Section ${dto.classSectionId}`,
          );
        }

        const upserted = await tx.dailyAttendance.upsert({
          where: {
            studentProfileId_classSectionId_date: {
              studentProfileId: record.studentProfileId,
              classSectionId: dto.classSectionId,
              date: targetDate,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks,
            recordedById: recordedByUserId,
          },
          create: {
            studentProfileId: record.studentProfileId,
            classSectionId: dto.classSectionId,
            date: targetDate,
            status: record.status,
            remarks: record.remarks,
            recordedById: recordedByUserId,
          },
        });
        results.push(upserted);
      }
      return results;
    });
  }

  async getDailyAttendance(classSectionId: string, dateStr: string) {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const section = await this.prisma.classSection.findUnique({
      where: { id: classSectionId },
    });
    if (!section) {
      throw new NotFoundException('Class section not found');
    }

    return this.prisma.dailyAttendance.findMany({
      where: {
        classSectionId,
        date: targetDate,
      },
      include: {
        studentProfile: true,
      },
      orderBy: {
        studentProfile: {
          fullName: 'asc',
        },
      },
    });
  }

  // ─── Course Session Operations ──────────────────────────────────────────────

  async createSession(dto: CreateSessionDto) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: dto.courseClassId },
    });
    if (!courseClass) {
      throw new NotFoundException('Course class not found');
    }

    const sessionDate = new Date(dto.date);
    if (isNaN(sessionDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    let start: Date | null = null;
    let end: Date | null = null;

    if (dto.startTime) {
      start = new Date(`${dto.date}T${dto.startTime}`);
      if (isNaN(start.getTime())) {
        throw new BadRequestException('Invalid start time format');
      }
    }

    if (dto.endTime) {
      end = new Date(`${dto.date}T${dto.endTime}`);
      if (isNaN(end.getTime())) {
        throw new BadRequestException('Invalid end time format');
      }
    }

    if (start && end && start > end) {
      throw new BadRequestException('Start time cannot be after end time');
    }

    return this.prisma.courseClassSession.create({
      data: {
        courseClassId: dto.courseClassId,
        date: sessionDate,
        startTime: start,
        endTime: end,
        topic: dto.topic,
      },
    });
  }

  async getSessionsForCourse(courseClassId: string) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
    });
    if (!courseClass) {
      throw new NotFoundException('Course class not found');
    }

    return this.prisma.courseClassSession.findMany({
      where: { courseClassId },
      orderBy: { date: 'desc' },
    });
  }

  // ─── Session Attendance ──────────────────────────────────────────────────────

  async recordSessionAttendance(dto: RecordSessionAttendanceDto, recordedByUserId?: string) {
    const session = await this.prisma.courseClassSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        courseClass: {
          include: { enrollments: true },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    const validStudentIds = new Set(
      session.courseClass.enrollments.map((e) => e.studentProfileId),
    );

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const record of dto.records) {
        if (!validStudentIds.has(record.studentProfileId)) {
          throw new BadRequestException(
            `Student with ID ${record.studentProfileId} is not enrolled in Course Class ${session.courseClassId}`,
          );
        }

        const upserted = await tx.courseClassAttendance.upsert({
          where: {
            studentProfileId_sessionId: {
              studentProfileId: record.studentProfileId,
              sessionId: dto.sessionId,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks,
            recordedById: recordedByUserId,
          },
          create: {
            studentProfileId: record.studentProfileId,
            sessionId: dto.sessionId,
            status: record.status,
            remarks: record.remarks,
            recordedById: recordedByUserId,
          },
        });
        results.push(upserted);
      }
      return results;
    });
  }

  async getSessionAttendance(sessionId: string) {
    const session = await this.prisma.courseClassSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    return this.prisma.courseClassAttendance.findMany({
      where: { sessionId },
      include: {
        studentProfile: true,
      },
      orderBy: {
        studentProfile: {
          fullName: 'asc',
        },
      },
    });
  }

  // ─── Reporting & Stats Summary ──────────────────────────────────────────────

  async getStudentSummary(studentProfileId: string, startDateStr?: string, endDateStr?: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const whereDaily: any = { studentProfileId };
    const whereCourse: any = { studentProfileId };

    if (startDateStr || endDateStr) {
      const range: any = {};
      if (startDateStr) range.gte = new Date(startDateStr);
      if (endDateStr) range.lte = new Date(endDateStr);

      whereDaily.date = range;
      whereCourse.session = { date: range };
    }

    const [dailyRecords, courseRecords] = await Promise.all([
      this.prisma.dailyAttendance.findMany({ where: whereDaily }),
      this.prisma.courseClassAttendance.findMany({ where: whereCourse }),
    ]);

    const calculateStats = (records: Array<{ status: AttendanceStatus }>) => {
      const total = records.length;
      if (total === 0) {
        return {
          total: 0,
          attendanceRate: 0,
          breakdown: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
        };
      }

      const breakdown = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
      records.forEach((r) => {
        breakdown[r.status] = (breakdown[r.status] || 0) + 1;
      });

      // Present + Excused + Late can count as attended or present/late
      const presentCount = breakdown.PRESENT + breakdown.LATE + breakdown.EXCUSED;
      const attendanceRate = Math.round((presentCount / total) * 100);

      return {
        total,
        attendanceRate,
        breakdown,
      };
    };

    return {
      studentId: studentProfileId,
      fullName: student.fullName,
      dailyStats: calculateStats(dailyRecords),
      subjectStats: calculateStats(courseRecords),
    };
  }
}
