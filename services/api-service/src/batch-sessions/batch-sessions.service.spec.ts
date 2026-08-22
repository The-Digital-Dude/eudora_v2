import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { BatchSessionsService } from './batch-sessions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BatchSessionsService', () => {
  let service: BatchSessionsService;

  const prisma: any = {
    batch: { findUnique: jest.fn() },
    teacherProfile: { findUnique: jest.fn() },
    studentCourseEnrollment: { findMany: jest.fn() },
    courseTeacher: { findMany: jest.fn() },
    batchSession: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  // Tue 1 Sep 2026 .. Tue 29 Sep 2026, meeting Tuesdays at 16:00 for an hour.
  const batch = {
    id: 'b1',
    name: 'Fractions',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-29T00:00:00.000Z'),
    meetingDays: [DayOfWeek.TUESDAY],
    meetingStartMinutes: 16 * 60,
    meetingDurationMinutes: 60,
  };

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        BatchSessionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(BatchSessionsService);
    jest.clearAllMocks();
    prisma.batchSession.findMany.mockResolvedValue([]);
    prisma.batchSession.findFirst.mockResolvedValue(null);
  });

  describe('planSessions', () => {
    it('produces one meeting per matching weekday across the range', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);

      const { planned } = await service.planSessions('b1');

      // Sep 2026: Tuesdays fall on 1, 8, 15, 22, 29.
      expect(planned).toHaveLength(5);
      expect(planned.map((p) => p.date.toISOString().slice(0, 10))).toEqual([
        '2026-09-01',
        '2026-09-08',
        '2026-09-15',
        '2026-09-22',
        '2026-09-29',
      ]);
    });

    it('applies the start time and duration to each meeting', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);

      const { planned } = await service.planSessions('b1');

      expect(planned[0].startTime.toISOString()).toBe(
        '2026-09-01T16:00:00.000Z',
      );
      expect(planned[0].endTime.toISOString()).toBe('2026-09-01T17:00:00.000Z');
    });

    it('handles a multi-day pattern', async () => {
      prisma.batch.findUnique.mockResolvedValue({
        ...batch,
        meetingDays: [DayOfWeek.MONDAY, DayOfWeek.THURSDAY],
      });

      const { planned } = await service.planSessions('b1');

      // Mondays 7, 14, 21, 28 and Thursdays 3, 10, 17, 24 — interleaved in
      // date order, not grouped by weekday.
      expect(planned.map((p) => p.date.toISOString().slice(0, 10))).toEqual([
        '2026-09-03',
        '2026-09-07',
        '2026-09-10',
        '2026-09-14',
        '2026-09-17',
        '2026-09-21',
        '2026-09-24',
        '2026-09-28',
      ]);
    });

    it('flags dates that already have a session instead of dropping them', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);
      prisma.batchSession.findMany.mockResolvedValue([
        { date: new Date('2026-09-08T00:00:00.000Z') },
      ]);

      const { planned } = await service.planSessions('b1');

      expect(planned).toHaveLength(5);
      expect(planned.filter((p) => p.alreadyScheduled)).toHaveLength(1);
      expect(
        planned
          .find((p) => p.alreadyScheduled)!
          .date.toISOString()
          .slice(0, 10),
      ).toBe('2026-09-08');
    });

    it('refuses when the batch has no meeting days', async () => {
      prisma.batch.findUnique.mockResolvedValue({ ...batch, meetingDays: [] });

      await expect(service.planSessions('b1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses when the batch has no meeting time', async () => {
      prisma.batch.findUnique.mockResolvedValue({
        ...batch,
        meetingStartMinutes: null,
      });

      await expect(service.planSessions('b1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses when the batch has no date range and none is supplied', async () => {
      prisma.batch.findUnique.mockResolvedValue({
        ...batch,
        startDate: null,
        endDate: null,
      });

      await expect(service.planSessions('b1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses a range longer than a year', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);

      await expect(
        service.planSessions('b1', { from: '2026-01-01', to: '2028-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a backwards range', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);

      await expect(
        service.planSessions('b1', { from: '2026-09-29', to: '2026-09-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('404s on an unknown batch', async () => {
      prisma.batch.findUnique.mockResolvedValue(null);

      await expect(service.planSessions('nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateSessions', () => {
    it('writes only the dates that are not already scheduled', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);
      prisma.batchSession.findMany.mockResolvedValue([
        { date: new Date('2026-09-01T00:00:00.000Z') },
        { date: new Date('2026-09-08T00:00:00.000Z') },
      ]);
      prisma.batchSession.createMany.mockResolvedValue({ count: 3 });

      const result = await service.generateSessions('b1');

      expect(result).toMatchObject({ created: 3, skipped: 2 });
      const written = prisma.batchSession.createMany.mock.calls[0][0].data;
      expect(written).toHaveLength(3);
      expect(
        written.map((d: any) => d.date.toISOString().slice(0, 10)),
      ).toEqual(['2026-09-15', '2026-09-22', '2026-09-29']);
    });

    it('refuses rather than writing nothing when every date is taken', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);
      prisma.batchSession.findMany.mockResolvedValue([
        { date: new Date('2026-09-01T00:00:00.000Z') },
        { date: new Date('2026-09-08T00:00:00.000Z') },
        { date: new Date('2026-09-15T00:00:00.000Z') },
        { date: new Date('2026-09-22T00:00:00.000Z') },
        { date: new Date('2026-09-29T00:00:00.000Z') },
      ]);

      await expect(service.generateSessions('b1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.batchSession.createMany).not.toHaveBeenCalled();
    });

    it('refuses when the pattern produces no dates in the range', async () => {
      prisma.batch.findUnique.mockResolvedValue(batch);

      // Wed 2 Sep to Mon 7 Sep contains no Tuesday.
      await expect(
        service.generateSessions('b1', {
          from: '2026-09-02',
          to: '2026-09-07',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createSession', () => {
    it('rejects a zero-length meeting', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1' });

      await expect(
        service.createSession({
          batchId: 'b1',
          date: '2026-09-01',
          startTime: '2026-09-01T16:00:00.000Z',
          endTime: '2026-09-01T16:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows a session with no times at all', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.batchSession.create.mockResolvedValue({ id: 's1' });

      await service.createSession({ batchId: 'b1', date: '2026-09-01' });

      expect(prisma.batchSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ startTime: null, endTime: null }),
        }),
      );
    });
  });

  describe('deleteSession', () => {
    it('refuses to delete a session that has attendance recorded', async () => {
      prisma.batchSession.findUnique.mockResolvedValue({
        id: 's1',
        _count: { attendance: 12 },
      });

      await expect(service.deleteSession('s1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.batchSession.delete).not.toHaveBeenCalled();
    });

    it('deletes a session with no attendance', async () => {
      prisma.batchSession.findUnique.mockResolvedValue({
        id: 's1',
        _count: { attendance: 0 },
      });

      await service.deleteSession('s1');

      expect(prisma.batchSession.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
    });
  });

  describe('teacher clash guard', () => {
    it('refuses a session that overlaps one the teacher already hosts', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.batchSession.findFirst.mockResolvedValue({
        id: 'other',
        date: new Date('2026-09-01T00:00:00.000Z'),
        startTime: new Date('2026-09-01T16:00:00.000Z'),
        batch: { name: 'Another Batch' },
      });

      await expect(
        service.createSession({
          batchId: 'b1',
          date: '2026-09-01',
          startTime: '2026-09-01T16:30:00.000Z',
          endTime: '2026-09-01T17:30:00.000Z',
          teacherUserId: 'teacher-user-1',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.batchSession.create).not.toHaveBeenCalled();
    });

    it('treats back-to-back sessions as no clash', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.batchSession.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        batchId: 'b1',
        date: '2026-09-01',
        startTime: '2026-09-01T17:00:00.000Z',
        endTime: '2026-09-01T18:00:00.000Z',
        teacherUserId: 'teacher-user-1',
      });

      // Half-open overlap: lt end / gt start, so 17:00 abutting a 17:00 finish
      // is not a conflict.
      const where = prisma.batchSession.findFirst.mock.calls[0][0].where;
      expect(where.startTime).toEqual({
        lt: new Date('2026-09-01T18:00:00.000Z'),
      });
      expect(where.endTime).toEqual({
        gt: new Date('2026-09-01T17:00:00.000Z'),
      });
    });

    it('skips the check when no teacher is named', async () => {
      prisma.batch.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.batchSession.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        batchId: 'b1',
        date: '2026-09-01',
        startTime: '2026-09-01T16:00:00.000Z',
        endTime: '2026-09-01T17:00:00.000Z',
      });

      expect(prisma.batchSession.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getStudentSchedule', () => {
    it('returns nothing for a student with no enrolments, without querying sessions', async () => {
      prisma.studentCourseEnrollment.findMany.mockResolvedValue([]);

      expect(await service.getStudentSchedule('s1')).toEqual([]);
      expect(prisma.batchSession.findMany).not.toHaveBeenCalled();
    });

    it('scopes to the batches the student is enrolled in — not to a placement', async () => {
      prisma.studentCourseEnrollment.findMany.mockResolvedValue([
        { batchId: 'b1' },
        { batchId: 'b2' },
      ]);

      await service.getStudentSchedule('s1');

      const where = prisma.batchSession.findMany.mock.calls[0][0].where;
      expect(where.batchId).toEqual({ in: ['b1', 'b2'] });
    });
  });
});
