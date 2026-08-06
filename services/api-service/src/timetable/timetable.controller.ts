import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { TimetableConflictService } from './timetable-conflict.service';
import {
  CreateTimetableDto,
  UpdateTimetableDto,
  CreateTimetableSlotDto,
  UpdateTimetableSlotDto,
  BulkUpsertSlotsDto,
  UpsertTimetableSlotDto,
} from './dto/timetable.dto';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { GuardianAccessService } from '../family/guardian-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimetableStatus } from '@prisma/client';

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'];

@Controller('timetables')
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly conflictService: TimetableConflictService,
    private readonly guardianAccessService: GuardianAccessService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermissions({ action: 'create', subject: 'Timetable' })
  async create(
    @Body() dto: CreateTimetableDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.timetableService.create(dto, user?.id);
  }

  @Get()
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async findAll(
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
    @Query('classSectionId') classSectionId?: string,
    @Query('status') status?: TimetableStatus,
  ) {
    return this.timetableService.findAll({
      academicYearId,
      termId,
      classSectionId,
      status,
    });
  }

  @Get('schedule/student/:studentProfileId')
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async getStudentSchedule(
    @Param('studentProfileId') studentProfileId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      studentProfileId,
    );
    return this.timetableService.getStudentSchedule(studentProfileId);
  }

  @Get('schedule/teacher/:teacherProfileId')
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async getTeacherSchedule(
    @Param('teacherProfileId') teacherProfileId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    if (!STAFF_ROLES.some((role) => user.roles.includes(role))) {
      const ownProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id },
      });
      if (ownProfile?.id !== teacherProfileId) {
        throw new ForbiddenException(
          'You do not have permission to view this schedule.',
        );
      }
    }
    return this.timetableService.getTeacherSchedule(teacherProfileId);
  }

  // No per-student ownership concept applies to a whole class section —
  // restrict to staff rather than trying to derive "does this caller belong
  // to this section" from a student/guardian identity.
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  @Get('schedule/class-section/:classSectionId')
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async getClassSectionSchedule(
    @Param('classSectionId') classSectionId: string,
  ) {
    return this.timetableService.getClassSectionSchedule(classSectionId);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async findOne(@Param('id') id: string) {
    return this.timetableService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'update', subject: 'Timetable' })
  async update(@Param('id') id: string, @Body() dto: UpdateTimetableDto) {
    return this.timetableService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ action: 'delete', subject: 'Timetable' })
  async remove(@Param('id') id: string) {
    return this.timetableService.remove(id);
  }

  @Post(':id/publish')
  @RequirePermissions({ action: 'update', subject: 'Timetable' })
  async publish(@Param('id') id: string) {
    return this.timetableService.publish(id);
  }

  // --- Slot Sub-routes ---

  @Post(':id/slots')
  @RequirePermissions({ action: 'update', subject: 'Timetable' })
  async createSlot(
    @Param('id') timetableId: string,
    @Body() dto: CreateTimetableSlotDto,
  ) {
    return this.timetableService.createSlot(timetableId, dto);
  }

  @Patch(':id/slots/:slotId')
  @RequirePermissions({ action: 'update', subject: 'Timetable' })
  async updateSlot(
    @Param('id') timetableId: string,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateTimetableSlotDto,
  ) {
    return this.timetableService.updateSlot(timetableId, slotId, dto);
  }

  @Delete(':id/slots/:slotId')
  @RequirePermissions({ action: 'update', subject: 'Timetable' })
  async removeSlot(
    @Param('id') timetableId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.timetableService.removeSlot(timetableId, slotId);
  }

  @Post(':id/slots/bulk-upsert')
  @RequirePermissions({ action: 'update', subject: 'Timetable' })
  async bulkUpsertSlots(
    @Param('id') timetableId: string,
    @Body() dto: BulkUpsertSlotsDto,
  ) {
    return this.timetableService.bulkUpsertSlots(timetableId, dto);
  }

  @Post('conflicts')
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async checkConflicts(
    @Body('timetableId') timetableId: string,
    @Body('slots') slots: UpsertTimetableSlotDto[],
  ) {
    if (!timetableId || !slots || !Array.isArray(slots)) {
      throw new BadRequestException(
        'timetableId and slots (array) are required',
      );
    }
    return this.conflictService.checkConflicts(timetableId, slots);
  }
}
