import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';

describe('AttendanceService', () => {
  let service: AttendanceService;

  const mockPrismaService = {
    classSection: {
      findUnique: jest.fn(),
    },
    dailyAttendance: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    studentClassPlacement: {
      findMany: jest.fn(),
    },
    batch: {
      findUnique: jest.fn(),
    },
    batchSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    batchAttendance: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    $transaction: jest
      .fn()
      .mockImplementation((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  describe('getClassDailySheet', () => {
    it('should throw BadRequestException if date format is invalid', async () => {
      await expect(
        service.getClassDailySheet('class-1', 'invalid-date'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return merged student roster with attendance details', async () => {
      mockPrismaService.studentClassPlacement.findMany.mockResolvedValue([
        {
          studentProfileId: 's1',
          studentProfile: { fullName: 'Alice', gender: 'FEMALE' },
        },
        {
          studentProfileId: 's2',
          studentProfile: { fullName: 'Bob', gender: 'MALE' },
        },
      ]);

      mockPrismaService.dailyAttendance.findMany.mockResolvedValue([
        {
          id: 'att-1',
          studentProfileId: 's1',
          status: AttendanceStatus.PRESENT,
          remarks: 'Good',
        },
      ]);

      const result = await service.getClassDailySheet('class-1', '2026-06-21');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        studentProfileId: 's1',
        fullName: 'Alice',
        gender: 'FEMALE',
        status: AttendanceStatus.PRESENT,
        remarks: 'Good',
        attendanceId: 'att-1',
      });
      expect(result[1]).toEqual({
        studentProfileId: 's2',
        fullName: 'Bob',
        gender: 'MALE',
        status: null,
        remarks: null,
        attendanceId: null,
      });
    });
  });

  describe('getClassAttendanceSummary', () => {
    it('should throw BadRequestException for invalid dates', async () => {
      await expect(
        service.getClassAttendanceSummary('class-1', 'invalid', '2026-06-21'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate attendance rates correctly', async () => {
      mockPrismaService.dailyAttendance.findMany.mockResolvedValue([
        { status: AttendanceStatus.PRESENT },
        { status: AttendanceStatus.ABSENT },
        { status: AttendanceStatus.LATE },
        { status: AttendanceStatus.EXCUSED },
      ]);

      const result = await service.getClassAttendanceSummary(
        'class-1',
        '2026-06-01',
        '2026-06-30',
      );

      // PRESENT (1) + LATE (1) + EXCUSED (1) = 3 attended. Total = 4. 3/4 = 75%
      expect(result.total).toBe(4);
      expect(result.attendanceRate).toBe(75);
      expect(result.breakdown).toEqual({
        PRESENT: 1,
        ABSENT: 1,
        LATE: 1,
        EXCUSED: 1,
      });
    });
  });

  describe('getMonthlyAttendanceSummary', () => {
    it('should aggregate monthly attendance correctly', async () => {
      mockPrismaService.dailyAttendance.findMany.mockResolvedValue([
        { status: AttendanceStatus.PRESENT },
        { status: AttendanceStatus.PRESENT },
      ]);

      const result = await service.getMonthlyAttendanceSummary(
        '2026-06',
        'year-1',
      );

      expect(result.month).toBe('2026-06');
      expect(result.total).toBe(2);
      expect(result.attendanceRate).toBe(100);
    });
  });

  describe('getAbsenceTrends', () => {
    it('should group absences and late entries by date', async () => {
      mockPrismaService.dailyAttendance.findMany.mockResolvedValue([
        {
          date: new Date('2026-06-21T00:00:00Z'),
          status: AttendanceStatus.ABSENT,
        },
        {
          date: new Date('2026-06-21T00:00:00Z'),
          status: AttendanceStatus.LATE,
        },
        {
          date: new Date('2026-06-22T00:00:00Z'),
          status: AttendanceStatus.ABSENT,
        },
      ]);

      const result = await service.getAbsenceTrends('2026-06-20', '2026-06-23');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2026-06-21',
        absentCount: 1,
        lateCount: 1,
      });
      expect(result[1]).toEqual({
        date: '2026-06-22',
        absentCount: 1,
        lateCount: 0,
      });
    });
  });

  describe('getAtRiskAttendanceStudents', () => {
    it('should find students with attendance below threshold', async () => {
      mockPrismaService.studentClassPlacement.findMany.mockResolvedValue([
        {
          studentProfileId: 's1',
          classSectionId: 'c1',
          studentProfile: { fullName: 'Alice' },
          classSection: { name: 'Grade 10A' },
        },
        {
          studentProfileId: 's2',
          classSectionId: 'c1',
          studentProfile: { fullName: 'Bob' },
          classSection: { name: 'Grade 10A' },
        },
      ]);

      // s1 has 1 absent, 1 present = 50%
      // s2 has 2 present = 100%
      mockPrismaService.dailyAttendance.findMany
        .mockResolvedValueOnce([
          { status: AttendanceStatus.PRESENT },
          { status: AttendanceStatus.ABSENT },
        ])
        .mockResolvedValueOnce([
          { status: AttendanceStatus.PRESENT },
          { status: AttendanceStatus.PRESENT },
        ]);

      const result = await service.getAtRiskAttendanceStudents(
        80,
        'year-1',
        'c1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].studentProfileId).toBe('s1');
      expect(result[0].attendanceRate).toBe(50);
    });
  });
});
