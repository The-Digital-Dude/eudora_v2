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
import { TimetableStatus } from '@prisma/client';

@Controller('timetables')
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly conflictService: TimetableConflictService,
  ) {}

  @Post()
  @RequirePermissions({ action: 'create', subject: 'Timetable' })
  async create(@Body() dto: CreateTimetableDto, @CurrentUser() user: any) {
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
  async getStudentSchedule(@Param('studentProfileId') studentProfileId: string) {
    return this.timetableService.getStudentSchedule(studentProfileId);
  }

  @Get('schedule/teacher/:teacherProfileId')
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async getTeacherSchedule(@Param('teacherProfileId') teacherProfileId: string) {
    return this.timetableService.getTeacherSchedule(teacherProfileId);
  }

  @Get('schedule/class-section/:classSectionId')
  @RequirePermissions({ action: 'read', subject: 'Timetable' })
  async getClassSectionSchedule(@Param('classSectionId') classSectionId: string) {
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
      throw new BadRequestException('timetableId and slots (array) are required');
    }
    return this.conflictService.checkConflicts(timetableId, slots);
  }
}
