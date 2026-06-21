import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimetableConflictService } from './timetable-conflict.service';
import {
  CreateTimetableDto,
  UpdateTimetableDto,
  CreateTimetableSlotDto,
  UpdateTimetableSlotDto,
  BulkUpsertSlotsDto,
} from './dto/timetable.dto';
import { TimetableStatus, TimetableSlotStatus, TimetableSlot } from '@prisma/client';

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictService: TimetableConflictService,
  ) {}

  async create(dto: CreateTimetableDto, userId?: string) {
    return this.prisma.timetable.create({
      data: {
        academicYearId: dto.academicYearId,
        termId: dto.termId || null,
        classSectionId: dto.classSectionId || null,
        name: dto.name,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdById: userId || null,
        status: TimetableStatus.DRAFT,
      },
    });
  }

  async findAll(filters: {
    academicYearId?: string;
    termId?: string;
    classSectionId?: string;
    status?: TimetableStatus;
  }) {
    return this.prisma.timetable.findMany({
      where: {
        ...(filters.academicYearId && { academicYearId: filters.academicYearId }),
        ...(filters.termId && { termId: filters.termId }),
        ...(filters.classSectionId && { classSectionId: filters.classSectionId }),
        ...(filters.status && { status: filters.status }),
      },
      include: {
        slots: {
          include: {
            courseClass: true,
            teacherProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const timetable = await this.prisma.timetable.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            courseClass: true,
            teacherProfile: true,
          },
        },
      },
    });

    if (!timetable) {
      throw new NotFoundException(`Timetable with ID ${id} not found`);
    }

    return timetable;
  }

  async update(id: string, dto: UpdateTimetableDto) {
    await this.findOne(id); // Throws NotFoundException if not exists

    return this.prisma.timetable.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.status && { status: dto.status }),
        ...(dto.effectiveFrom && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.effectiveTo !== undefined && {
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.timetable.delete({
      where: { id },
    });
  }

  async publish(id: string) {
    const timetable = await this.findOne(id);

    // Validate conflicts on all active slots in this timetable before publishing
    const activeSlots = timetable.slots.filter(
      (s) => s.status === TimetableSlotStatus.ACTIVE,
    );

    const conflicts = await this.conflictService.checkConflicts(
      id,
      activeSlots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        periodIndex: s.periodIndex,
        startTimeMinutes: s.startTimeMinutes,
        endTimeMinutes: s.endTimeMinutes,
        room: s.room || undefined,
        classSectionId: s.classSectionId,
        courseClassId: s.courseClassId || undefined,
        teacherProfileId: s.teacherProfileId || undefined,
        notes: s.notes || undefined,
      })),
    );

    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: 'Cannot publish timetable due to booking conflicts.',
        conflicts,
      });
    }

    return this.prisma.timetable.update({
      where: { id },
      data: {
        status: TimetableStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  // --- Slot Management ---

  async createSlot(timetableId: string, dto: CreateTimetableSlotDto) {
    await this.findOne(timetableId);

    // Validate single slot conflict
    const conflicts = await this.conflictService.checkConflicts(timetableId, [
      {
        dayOfWeek: dto.dayOfWeek,
        periodIndex: dto.periodIndex,
        startTimeMinutes: dto.startTimeMinutes,
        endTimeMinutes: dto.endTimeMinutes,
        room: dto.room,
        classSectionId: dto.classSectionId,
        courseClassId: dto.courseClassId,
        teacherProfileId: dto.teacherProfileId,
        notes: dto.notes,
      },
    ]);

    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: 'Timetable slot scheduling conflict detected.',
        conflicts,
      });
    }

    return this.prisma.timetableSlot.create({
      data: {
        timetableId,
        dayOfWeek: dto.dayOfWeek,
        periodIndex: dto.periodIndex,
        startTimeMinutes: dto.startTimeMinutes,
        endTimeMinutes: dto.endTimeMinutes,
        room: dto.room || null,
        classSectionId: dto.classSectionId,
        courseClassId: dto.courseClassId || null,
        teacherProfileId: dto.teacherProfileId || null,
        notes: dto.notes || null,
        status: TimetableSlotStatus.ACTIVE,
      },
    });
  }

  async updateSlot(
    timetableId: string,
    slotId: string,
    dto: UpdateTimetableSlotDto,
  ) {
    await this.findOne(timetableId);

    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id: slotId, timetableId },
    });

    if (!slot) {
      throw new NotFoundException(
        `Slot with ID ${slotId} not found in timetable ${timetableId}`,
      );
    }

    // Merge changes to validate
    const updatedSlot = {
      id: slotId,
      dayOfWeek: dto.dayOfWeek ?? slot.dayOfWeek,
      periodIndex: dto.periodIndex ?? slot.periodIndex,
      startTimeMinutes: dto.startTimeMinutes ?? slot.startTimeMinutes,
      endTimeMinutes: dto.endTimeMinutes ?? slot.endTimeMinutes,
      room: dto.room !== undefined ? dto.room : (slot.room || undefined),
      classSectionId: dto.classSectionId ?? slot.classSectionId,
      courseClassId:
        dto.courseClassId !== undefined
          ? dto.courseClassId
          : (slot.courseClassId || undefined),
      teacherProfileId:
        dto.teacherProfileId !== undefined
          ? dto.teacherProfileId
          : (slot.teacherProfileId || undefined),
      notes: dto.notes !== undefined ? dto.notes : (slot.notes || undefined),
    };

    // Run conflict validation only if slot remains ACTIVE
    const newStatus = dto.status ?? slot.status;
    if (newStatus === TimetableSlotStatus.ACTIVE) {
      const conflicts = await this.conflictService.checkConflicts(
        timetableId,
        [updatedSlot],
      );
      if (conflicts.length > 0) {
        throw new BadRequestException({
          message: 'Timetable slot scheduling conflict detected.',
          conflicts,
        });
      }
    }

    return this.prisma.timetableSlot.update({
      where: { id: slotId },
      data: {
        ...(dto.dayOfWeek && { dayOfWeek: dto.dayOfWeek }),
        ...(dto.periodIndex !== undefined && { periodIndex: dto.periodIndex }),
        ...(dto.startTimeMinutes !== undefined && {
          startTimeMinutes: dto.startTimeMinutes,
        }),
        ...(dto.endTimeMinutes !== undefined && {
          endTimeMinutes: dto.endTimeMinutes,
        }),
        ...(dto.room !== undefined && { room: dto.room || null }),
        ...(dto.classSectionId && { classSectionId: dto.classSectionId }),
        ...(dto.courseClassId !== undefined && {
          courseClassId: dto.courseClassId || null,
        }),
        ...(dto.teacherProfileId !== undefined && {
          teacherProfileId: dto.teacherProfileId || null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async removeSlot(timetableId: string, slotId: string) {
    await this.findOne(timetableId);

    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id: slotId, timetableId },
    });

    if (!slot) {
      throw new NotFoundException(
        `Slot with ID ${slotId} not found in timetable ${timetableId}`,
      );
    }

    return this.prisma.timetableSlot.delete({
      where: { id: slotId },
    });
  }

  async bulkUpsertSlots(timetableId: string, dto: BulkUpsertSlotsDto) {
    await this.findOne(timetableId);

    // Validate the proposed slots bulk payload
    const conflicts = await this.conflictService.checkConflicts(
      timetableId,
      dto.slots,
    );

    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: 'Timetable bulk upsert blocked by conflicts.',
        conflicts,
      });
    }

    const results: TimetableSlot[] = [];

    // Perform upsert inside transaction
    await this.prisma.$transaction(async (tx) => {
      for (const slotDto of dto.slots) {
        if (slotDto.id) {
          const updated = await tx.timetableSlot.update({
            where: { id: slotDto.id },
            data: {
              dayOfWeek: slotDto.dayOfWeek,
              periodIndex: slotDto.periodIndex,
              startTimeMinutes: slotDto.startTimeMinutes,
              endTimeMinutes: slotDto.endTimeMinutes,
              room: slotDto.room || null,
              classSectionId: slotDto.classSectionId,
              courseClassId: slotDto.courseClassId || null,
              teacherProfileId: slotDto.teacherProfileId || null,
              notes: slotDto.notes || null,
            },
          });
          results.push(updated);
        } else {
          const created = await tx.timetableSlot.create({
            data: {
              timetableId,
              dayOfWeek: slotDto.dayOfWeek,
              periodIndex: slotDto.periodIndex,
              startTimeMinutes: slotDto.startTimeMinutes,
              endTimeMinutes: slotDto.endTimeMinutes,
              room: slotDto.room || null,
              classSectionId: slotDto.classSectionId,
              courseClassId: slotDto.courseClassId || null,
              teacherProfileId: slotDto.teacherProfileId || null,
              notes: slotDto.notes || null,
              status: TimetableSlotStatus.ACTIVE,
            },
          });
          results.push(created);
        }
      }
    });

    return results;
  }

  // --- Schedule Views ---

  async getStudentSchedule(studentProfileId: string) {
    // 1. Get placements to find classSectionId
    const placements = await this.prisma.studentClassPlacement.findMany({
      where: {
        studentProfileId,
        isActive: true,
      },
    });

    const classSectionIds = placements.map((p) => p.classSectionId);

    if (classSectionIds.length === 0) {
      return [];
    }

    // 2. Fetch the student's course enrollments to filter course class slots
    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: {
        studentProfileId,
        status: 'ENROLLED',
      },
    });

    const courseClassIds = enrollments.map((e) => e.courseClassId);

    // 3. Query all published timetable slots for these class sections
    return this.prisma.timetableSlot.findMany({
      where: {
        classSectionId: { in: classSectionIds },
        status: TimetableSlotStatus.ACTIVE,
        timetable: {
          status: TimetableStatus.PUBLISHED,
        },
        // A slot is shown if:
        // - It has no course class (e.g. homeroom / study period)
        // - OR the student is enrolled in the course class
        OR: [
          { courseClassId: null },
          { courseClassId: { in: courseClassIds } },
        ],
      },
      include: {
        timetable: true,
        courseClass: true,
        teacherProfile: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTimeMinutes: 'asc' },
      ],
    });
  }

  async getTeacherSchedule(teacherProfileId: string) {
    return this.prisma.timetableSlot.findMany({
      where: {
        teacherProfileId,
        status: TimetableSlotStatus.ACTIVE,
        timetable: {
          status: TimetableStatus.PUBLISHED,
        },
      },
      include: {
        timetable: true,
        courseClass: true,
        classSection: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTimeMinutes: 'asc' },
      ],
    });
  }

  async getClassSectionSchedule(classSectionId: string) {
    return this.prisma.timetableSlot.findMany({
      where: {
        classSectionId,
        status: TimetableSlotStatus.ACTIVE,
        timetable: {
          status: TimetableStatus.PUBLISHED,
        },
      },
      include: {
        timetable: true,
        courseClass: true,
        teacherProfile: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTimeMinutes: 'asc' },
      ],
    });
  }
}
