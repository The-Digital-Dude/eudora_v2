import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTimetableSlotDto } from './dto/timetable.dto';
import {
  DayOfWeek,
  TimetableSlotStatus,
  TimetableStatus,
} from '@prisma/client';

export type TimetableConflict = {
  type: 'TEACHER' | 'CLASS_SECTION' | 'ROOM' | 'INVALID_TIME';
  message: string;
  slotIndex?: number;
  conflictingSlotId?: string;
  conflictingTimetableId?: string;
  dayOfWeek: DayOfWeek;
  startTimeMinutes: number;
  endTimeMinutes: number;
};

@Injectable()
export class TimetableConflictService {
  constructor(private readonly prisma: PrismaService) {}

  private datesOverlap(
    fromA: Date | string,
    toA: Date | string | null,
    fromB: Date | string,
    toB: Date | string | null,
  ): boolean {
    const startA = new Date(fromA).getTime();
    const endA = toA ? new Date(toA).getTime() : Infinity;
    const startB = new Date(fromB).getTime();
    const endB = toB ? new Date(toB).getTime() : Infinity;

    return startA <= endB && startB <= endA;
  }

  private minutesOverlap(
    startA: number,
    endA: number,
    startB: number,
    endB: number,
  ): boolean {
    return startA < endB && startB < endA;
  }

  async checkConflicts(
    timetableId: string,
    slots: UpsertTimetableSlotDto[],
  ): Promise<TimetableConflict[]> {
    const conflicts: TimetableConflict[] = [];

    // Fetch target timetable to check effective date ranges
    const timetable = await this.prisma.timetable.findUnique({
      where: { id: timetableId },
    });

    if (!timetable) {
      throw new BadRequestException(
        `Timetable with ID ${timetableId} not found`,
      );
    }

    // 1. Check self-conflicts within the payload and basic validations
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot.startTimeMinutes >= slot.endTimeMinutes) {
        conflicts.push({
          type: 'INVALID_TIME',
          message: `Slot at index ${i} has start time (${slot.startTimeMinutes}) greater than or equal to end time (${slot.endTimeMinutes})`,
          slotIndex: i,
          dayOfWeek: slot.dayOfWeek,
          startTimeMinutes: slot.startTimeMinutes,
          endTimeMinutes: slot.endTimeMinutes,
        });
      }

      // Compare with other slots in the same bulk payload
      for (let j = i + 1; j < slots.length; j++) {
        const other = slots[j];
        if (
          slot.dayOfWeek === other.dayOfWeek &&
          this.minutesOverlap(
            slot.startTimeMinutes,
            slot.endTimeMinutes,
            other.startTimeMinutes,
            other.endTimeMinutes,
          )
        ) {
          // Class Section Conflict in payload
          if (slot.classSectionId === other.classSectionId) {
            conflicts.push({
              type: 'CLASS_SECTION',
              message: `Double booking class section ${slot.classSectionId} within the uploaded slots`,
              slotIndex: j,
              dayOfWeek: slot.dayOfWeek,
              startTimeMinutes: other.startTimeMinutes,
              endTimeMinutes: other.endTimeMinutes,
            });
          }

          // Teacher Conflict in payload
          if (
            slot.teacherProfileId &&
            other.teacherProfileId &&
            slot.teacherProfileId === other.teacherProfileId
          ) {
            conflicts.push({
              type: 'TEACHER',
              message: `Double booking teacher profile ${slot.teacherProfileId} within the uploaded slots`,
              slotIndex: j,
              dayOfWeek: slot.dayOfWeek,
              startTimeMinutes: other.startTimeMinutes,
              endTimeMinutes: other.endTimeMinutes,
            });
          }

          // Room Conflict in payload
          if (slot.room && other.room && slot.room === other.room) {
            conflicts.push({
              type: 'ROOM',
              message: `Double booking room ${slot.room} within the uploaded slots`,
              slotIndex: j,
              dayOfWeek: slot.dayOfWeek,
              startTimeMinutes: other.startTimeMinutes,
              endTimeMinutes: other.endTimeMinutes,
            });
          }
        }
      }
    }

    // If there are time violations or internal payload conflicts, stop and return them
    if (conflicts.length > 0) {
      return conflicts;
    }

    // 2. Fetch potential database conflicts
    // Fetch all active slots for the days involved in the check
    const daysToCheck = Array.from(new Set(slots.map((s) => s.dayOfWeek)));

    const dbSlots = await this.prisma.timetableSlot.findMany({
      where: {
        dayOfWeek: { in: daysToCheck },
        status: TimetableSlotStatus.ACTIVE,
        timetable: {
          status: { not: TimetableStatus.ARCHIVED },
        },
      },
      include: {
        timetable: true,
      },
    });

    // Check each proposed slot against database slots
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];

      for (const dbSlot of dbSlots) {
        // Skip comparing a slot with itself (in case of updates)
        if (slot.id && slot.id === dbSlot.id) {
          continue;
        }

        // Only compare if days match and timetables overlap in effective date ranges
        if (
          slot.dayOfWeek === dbSlot.dayOfWeek &&
          this.datesOverlap(
            timetable.effectiveFrom,
            timetable.effectiveTo,
            dbSlot.timetable.effectiveFrom,
            dbSlot.timetable.effectiveTo,
          ) &&
          this.minutesOverlap(
            slot.startTimeMinutes,
            slot.endTimeMinutes,
            dbSlot.startTimeMinutes,
            dbSlot.endTimeMinutes,
          )
        ) {
          // Class Section Conflict
          if (slot.classSectionId === dbSlot.classSectionId) {
            conflicts.push({
              type: 'CLASS_SECTION',
              message: `Class section ${slot.classSectionId} is already scheduled on ${slot.dayOfWeek} between ${dbSlot.startTimeMinutes} and ${dbSlot.endTimeMinutes} minutes in timetable "${dbSlot.timetable.name}"`,
              slotIndex: i,
              conflictingSlotId: dbSlot.id,
              conflictingTimetableId: dbSlot.timetableId,
              dayOfWeek: slot.dayOfWeek,
              startTimeMinutes: slot.startTimeMinutes,
              endTimeMinutes: slot.endTimeMinutes,
            });
          }

          // Teacher Conflict
          if (
            slot.teacherProfileId &&
            dbSlot.teacherProfileId &&
            slot.teacherProfileId === dbSlot.teacherProfileId
          ) {
            conflicts.push({
              type: 'TEACHER',
              message: `Teacher ${slot.teacherProfileId} is already scheduled on ${slot.dayOfWeek} between ${dbSlot.startTimeMinutes} and ${dbSlot.endTimeMinutes} minutes in timetable "${dbSlot.timetable.name}"`,
              slotIndex: i,
              conflictingSlotId: dbSlot.id,
              conflictingTimetableId: dbSlot.timetableId,
              dayOfWeek: slot.dayOfWeek,
              startTimeMinutes: slot.startTimeMinutes,
              endTimeMinutes: slot.endTimeMinutes,
            });
          }

          // Room Conflict
          if (slot.room && dbSlot.room && slot.room === dbSlot.room) {
            conflicts.push({
              type: 'ROOM',
              message: `Room "${slot.room}" is already scheduled on ${slot.dayOfWeek} between ${dbSlot.startTimeMinutes} and ${dbSlot.endTimeMinutes} minutes in timetable "${dbSlot.timetable.name}"`,
              slotIndex: i,
              conflictingSlotId: dbSlot.id,
              conflictingTimetableId: dbSlot.timetableId,
              dayOfWeek: slot.dayOfWeek,
              startTimeMinutes: slot.startTimeMinutes,
              endTimeMinutes: slot.endTimeMinutes,
            });
          }
        }
      }
    }

    return conflicts;
  }
}
