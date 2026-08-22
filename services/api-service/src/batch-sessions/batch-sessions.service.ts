import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DayOfWeek, LiveClassStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** JS `getUTCDay()` is 0=Sunday; the Prisma enum starts at Monday. */
const WEEKDAY_BY_INDEX: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

const MINUTES_IN_DAY = 24 * 60;

export interface CreateBatchSessionInput {
  batchId: string;
  /** Calendar day the meeting falls on, as YYYY-MM-DD or an ISO instant. */
  date: string | Date;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  topic?: string | null;
  teacherUserId?: string | null;
  moduleItemId?: string | null;
}

export interface GenerateSessionsInput {
  /** Defaults to the batch's own startDate / endDate. */
  from?: string | null;
  to?: string | null;
  topic?: string | null;
}

export interface PlannedSession {
  date: Date;
  startTime: Date;
  endTime: Date;
  topic: string | null;
  /** True when a session already exists for this batch on this date. */
  alreadyScheduled: boolean;
}

/**
 * The single owner of `BatchSession` writes.
 *
 * Sessions used to be created from two places — `AttendanceService` (date plus
 * "09:00" strings, no teacher, and a check that let start equal end) and
 * `LiveClassesService` (ISO instants, teacher, module item). The same table
 * ended up holding two shapes depending on which screen made the row. Both now
 * come through here.
 */
@Injectable()
export class BatchSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** UTC midnight of the day an instant falls on — BatchSession.date is a DATE. */
  private dayOf(instant: Date): Date {
    return new Date(
      Date.UTC(
        instant.getUTCFullYear(),
        instant.getUTCMonth(),
        instant.getUTCDate(),
      ),
    );
  }

  private parseDate(value: string | Date, field: string): Date {
    // A bare YYYY-MM-DD parses as UTC midnight, which is what we want; an ISO
    // instant is reduced to its day by the caller where relevant.
    const parsed = value instanceof Date ? value : new Date(value);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return parsed;
  }

  async createSession(input: CreateBatchSessionInput) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: input.batchId },
      select: { id: true },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const date = this.dayOf(this.parseDate(input.date, 'date'));
    const startTime = input.startTime
      ? this.parseDate(input.startTime, 'startTime')
      : null;
    const endTime = input.endTime
      ? this.parseDate(input.endTime, 'endTime')
      : null;

    // The one rule. The attendance path used to accept start === end, which
    // produces a zero-length meeting nobody can attend.
    if (startTime && endTime && endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    // The one thing the old Timetable did that sessions did not: stop a
    // teacher being booked into two places at once. Only meaningful when we
    // know both the host and the window.
    if (input.teacherUserId && startTime && endTime) {
      await this.assertNoTeacherClash(input.teacherUserId, startTime, endTime);
    }

    return this.prisma.batchSession.create({
      data: {
        batchId: input.batchId,
        date,
        startTime,
        endTime,
        topic: input.topic ?? null,
        teacherUserId: input.teacherUserId ?? null,
        moduleItemId: input.moduleItemId ?? null,
      },
    });
  }

  /**
   * Work out which meetings the batch's weekly pattern implies over a range.
   *
   * Pure apart from the two reads: it returns a plan, and `generateSessions`
   * decides whether to write it. Dates that already have a session for this
   * batch are returned flagged rather than dropped, so the caller can show
   * "3 new, 9 already scheduled" instead of silently doing less than asked.
   */
  async planSessions(
    batchId: string,
    input: GenerateSessionsInput = {},
  ): Promise<{ planned: PlannedSession[]; from: Date; to: Date }> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        meetingDays: true,
        meetingStartMinutes: true,
        meetingDurationMinutes: true,
      },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (!batch.meetingDays || batch.meetingDays.length === 0) {
      throw new BadRequestException(
        'This batch has no weekly meeting pattern. Set the meeting days first.',
      );
    }
    if (
      batch.meetingStartMinutes == null ||
      batch.meetingDurationMinutes == null
    ) {
      throw new BadRequestException(
        'This batch has no meeting time. Set a start time and duration first.',
      );
    }
    if (
      batch.meetingStartMinutes < 0 ||
      batch.meetingStartMinutes >= MINUTES_IN_DAY
    ) {
      throw new BadRequestException('Meeting start time is out of range');
    }
    if (batch.meetingDurationMinutes <= 0) {
      throw new BadRequestException('Meeting duration must be positive');
    }

    const fromRaw = input.from ?? batch.startDate;
    const toRaw = input.to ?? batch.endDate;
    if (!fromRaw || !toRaw) {
      throw new BadRequestException(
        'This batch has no start and end date, so there is no range to generate over.',
      );
    }

    const from = this.dayOf(this.parseDate(fromRaw, 'from'));
    const to = this.dayOf(this.parseDate(toRaw, 'to'));
    if (to < from) {
      throw new BadRequestException('End of range is before the start');
    }

    // A year of daily meetings is 365 rows; anything beyond that is a mistake
    // in the dates rather than a real schedule.
    const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (spanDays > 366) {
      throw new BadRequestException(
        'Range is longer than a year. Narrow it before generating.',
      );
    }

    const existing = await this.prisma.batchSession.findMany({
      where: { batchId, date: { gte: from, lte: to } },
      select: { date: true },
    });
    const taken = new Set(existing.map((s) => s.date.toISOString()));

    const wanted = new Set(batch.meetingDays);
    const planned: PlannedSession[] = [];

    for (
      let cursor = new Date(from);
      cursor <= to;
      cursor = new Date(cursor.getTime() + 86_400_000)
    ) {
      if (!wanted.has(WEEKDAY_BY_INDEX[cursor.getUTCDay()])) continue;

      const date = new Date(cursor);
      const startTime = new Date(
        date.getTime() + batch.meetingStartMinutes * 60_000,
      );
      const endTime = new Date(
        startTime.getTime() + batch.meetingDurationMinutes * 60_000,
      );

      planned.push({
        date,
        startTime,
        endTime,
        topic: input.topic ?? null,
        alreadyScheduled: taken.has(date.toISOString()),
      });
    }

    return { planned, from, to };
  }

  /**
   * Materialise the plan. Dates that already have a session are skipped rather
   * than duplicated, so extending a batch's end date and re-running adds only
   * the new meetings and leaves the existing ones — and their attendance — alone.
   */
  async generateSessions(batchId: string, input: GenerateSessionsInput = {}) {
    const { planned, from, to } = await this.planSessions(batchId, input);

    const toCreate = planned.filter((p) => !p.alreadyScheduled);
    if (toCreate.length === 0) {
      throw new ConflictException(
        planned.length === 0
          ? 'The meeting pattern produces no dates in this range.'
          : 'Every date in this range already has a session.',
      );
    }

    const data: Prisma.BatchSessionCreateManyInput[] = toCreate.map((p) => ({
      batchId,
      date: p.date,
      startTime: p.startTime,
      endTime: p.endTime,
      topic: p.topic,
    }));

    const result = await this.prisma.batchSession.createMany({ data });

    return {
      created: result.count,
      skipped: planned.length - toCreate.length,
      from,
      to,
    };
  }

  async listSessions(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return this.prisma.batchSession.findMany({
      where: { batchId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        moduleItem: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { attendance: true } },
      },
    });
  }

  /**
   * Refuses once attendance exists: deleting then would destroy the register
   * for a meeting that actually happened. Cancelling keeps the row.
   */
  async deleteSession(sessionId: string) {
    const session = await this.prisma.batchSession.findUnique({
      where: { id: sessionId },
      select: { id: true, _count: { select: { attendance: true } } },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session._count.attendance > 0) {
      throw new ConflictException(
        `This session has ${session._count.attendance} attendance record(s). Cancel it instead of deleting.`,
      );
    }
    await this.prisma.batchSession.delete({ where: { id: sessionId } });
    return { message: 'Session deleted' };
  }

  /**
   * Rejects a session that would put one teacher in two places at once.
   * Overlap is half-open: a class ending at 17:00 and another starting at
   * 17:00 do not clash.
   */
  private async assertNoTeacherClash(
    teacherUserId: string,
    startTime: Date,
    endTime: Date,
    excludeSessionId?: string,
  ): Promise<void> {
    const clash = await this.prisma.batchSession.findFirst({
      where: {
        teacherUserId,
        status: { notIn: [LiveClassStatus.CANCELLED, LiveClassStatus.ENDED] },
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        batch: { select: { name: true } },
      },
    });

    if (clash) {
      const when = clash.startTime
        ? clash.startTime.toISOString().slice(11, 16)
        : clash.date.toISOString().slice(0, 10);
      throw new ConflictException(
        `That teacher is already booked at ${when} for ${clash.batch.name}.`,
      );
    }
  }

  /**
   * What this student actually attends.
   *
   * Replaces the Timetable version, which resolved through
   * `StudentClassPlacement` and so returned an empty schedule for every
   * student who arrived through checkout — they never get a placement.
   */
  async getStudentSchedule(
    studentProfileId: string,
    range: { from?: string | null; to?: string | null } = {},
  ) {
    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: { studentProfileId, status: 'ENROLLED' },
      select: { batchId: true },
    });
    if (enrollments.length === 0) return [];

    return this.prisma.batchSession.findMany({
      where: {
        batchId: { in: enrollments.map((e) => e.batchId) },
        ...this.rangeFilter(range),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        batch: { select: { id: true, name: true, code: true } },
        moduleItem: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Every session a teacher is involved in: ones they host directly, plus
   * ones belonging to a batch they lead or whose course they teach.
   */
  async getTeacherSchedule(
    teacherProfileId: string,
    range: { from?: string | null; to?: string | null } = {},
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { id: true, userId: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    const courseIds = (
      await this.prisma.courseTeacher.findMany({
        where: { teacherProfileId },
        select: { courseId: true },
      })
    ).map((c) => c.courseId);

    return this.prisma.batchSession.findMany({
      where: {
        ...this.rangeFilter(range),
        OR: [
          { teacherUserId: teacher.userId },
          { batch: { leadTeacherProfileId: teacherProfileId } },
          ...(courseIds.length > 0
            ? [{ batch: { courseId: { in: courseIds } } }]
            : []),
        ],
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        batch: { select: { id: true, name: true, code: true } },
        moduleItem: { select: { id: true, title: true } },
      },
    });
  }

  private rangeFilter(range: { from?: string | null; to?: string | null }) {
    if (!range.from && !range.to) return {};
    return {
      date: {
        ...(range.from
          ? { gte: this.dayOf(this.parseDate(range.from, 'from')) }
          : {}),
        ...(range.to
          ? { lte: this.dayOf(this.parseDate(range.to, 'to')) }
          : {}),
      },
    };
  }
}
