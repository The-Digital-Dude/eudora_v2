import { Test, TestingModule } from '@nestjs/testing';
import { TimetableConflictService } from './timetable-conflict.service';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfWeek } from '@prisma/client';

describe('TimetableConflictService', () => {
  let service: TimetableConflictService;

  const mockPrismaService = {
    timetable: {
      findUnique: jest.fn(),
    },
    timetableSlot: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableConflictService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TimetableConflictService>(TimetableConflictService);
    jest.clearAllMocks();
  });

  describe('checkConflicts', () => {
    const targetTimetableId = 'timetable-1';
    const mockTimetable = {
      id: targetTimetableId,
      name: 'Autumn Term 2026',
      effectiveFrom: new Date('2026-09-01'),
      effectiveTo: new Date('2026-12-31'),
    };

    beforeEach(() => {
      mockPrismaService.timetable.findUnique.mockResolvedValue(mockTimetable);
      mockPrismaService.timetableSlot.findMany.mockResolvedValue([]);
    });

    it('should pass validation for valid non-conflicting slots', async () => {
      const slots = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 1,
          startTimeMinutes: 540, // 09:00 AM
          endTimeMinutes: 600, // 10:00 AM
          classSectionId: 'class-section-1',
          teacherProfileId: 'teacher-1',
          room: 'Room 101',
        },
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 2,
          startTimeMinutes: 600, // 10:00 AM (Adjacent, no overlap)
          endTimeMinutes: 660, // 11:00 AM
          classSectionId: 'class-section-1',
          teacherProfileId: 'teacher-1',
          room: 'Room 101',
        },
      ];

      const conflicts = await service.checkConflicts(targetTimetableId, slots);
      expect(conflicts).toHaveLength(0);
    });

    it('should reject slots with invalid start and end times', async () => {
      const slots = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 1,
          startTimeMinutes: 600,
          endTimeMinutes: 540, // End before start
          classSectionId: 'class-section-1',
        },
      ];

      const conflicts = await service.checkConflicts(targetTimetableId, slots);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('INVALID_TIME');
    });

    it('should detect internal payload conflicts for same class section', async () => {
      const slots = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 1,
          startTimeMinutes: 540,
          endTimeMinutes: 600,
          classSectionId: 'class-section-1',
        },
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 2,
          startTimeMinutes: 570, // Overlapping time
          endTimeMinutes: 630,
          classSectionId: 'class-section-1',
        },
      ];

      const conflicts = await service.checkConflicts(targetTimetableId, slots);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('CLASS_SECTION');
    });

    it('should detect internal payload conflicts for same teacher', async () => {
      const slots = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 1,
          startTimeMinutes: 540,
          endTimeMinutes: 600,
          classSectionId: 'class-section-1',
          teacherProfileId: 'teacher-1',
        },
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 2,
          startTimeMinutes: 570, // Overlapping time
          endTimeMinutes: 630,
          classSectionId: 'class-section-2',
          teacherProfileId: 'teacher-1',
        },
      ];

      const conflicts = await service.checkConflicts(targetTimetableId, slots);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('TEACHER');
    });

    it('should detect database conflict for class section on overlapping timetable dates', async () => {
      const slots = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 1,
          startTimeMinutes: 540,
          endTimeMinutes: 600,
          classSectionId: 'class-section-1',
        },
      ];

      const conflictingDbSlot = {
        id: 'db-slot-1',
        timetableId: 'timetable-2',
        dayOfWeek: DayOfWeek.MONDAY,
        startTimeMinutes: 570, // Overlaps 540-600
        endTimeMinutes: 630,
        classSectionId: 'class-section-1',
        timetable: {
          id: 'timetable-2',
          name: 'Conflicting Timetable',
          effectiveFrom: new Date('2026-10-01'), // Overlaps Sep-Dec range
          effectiveTo: new Date('2026-11-30'),
        },
      };

      mockPrismaService.timetableSlot.findMany.mockResolvedValue([
        conflictingDbSlot,
      ]);

      const conflicts = await service.checkConflicts(targetTimetableId, slots);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('CLASS_SECTION');
      expect(conflicts[0].conflictingSlotId).toBe('db-slot-1');
    });

    it('should ignore database slot if it belongs to different non-overlapping date range', async () => {
      const slots = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          periodIndex: 1,
          startTimeMinutes: 540,
          endTimeMinutes: 600,
          classSectionId: 'class-section-1',
        },
      ];

      const nonConflictingDbSlot = {
        id: 'db-slot-2',
        timetableId: 'timetable-3',
        dayOfWeek: DayOfWeek.MONDAY,
        startTimeMinutes: 570,
        endTimeMinutes: 630,
        classSectionId: 'class-section-1',
        timetable: {
          id: 'timetable-3',
          name: 'Future Term',
          effectiveFrom: new Date('2027-01-01'), // Does not overlap Sep-Dec 2026
          effectiveTo: new Date('2027-06-30'),
        },
      };

      mockPrismaService.timetableSlot.findMany.mockResolvedValue([
        nonConflictingDbSlot,
      ]);

      const conflicts = await service.checkConflicts(targetTimetableId, slots);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect database conflict for same room', async () => {
      const slots = [
        {
          dayOfWeek: DayOfWeek.TUESDAY,
          periodIndex: 1,
          startTimeMinutes: 600,
          endTimeMinutes: 700,
          classSectionId: 'class-section-1',
          room: 'Room B',
        },
      ];

      const conflictingDbSlot = {
        id: 'db-slot-3',
        timetableId: 'timetable-2',
        dayOfWeek: DayOfWeek.TUESDAY,
        startTimeMinutes: 650,
        endTimeMinutes: 750,
        classSectionId: 'class-section-2',
        room: 'Room B',
        timetable: {
          id: 'timetable-2',
          name: 'Conflicting Timetable',
          effectiveFrom: new Date('2026-09-01'),
          effectiveTo: null,
        },
      };

      mockPrismaService.timetableSlot.findMany.mockResolvedValue([
        conflictingDbSlot,
      ]);

      const conflicts = await service.checkConflicts(targetTimetableId, slots);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('ROOM');
    });
  });
});
