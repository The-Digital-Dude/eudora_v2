import { Controller, Get, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CurrentUserDto } from '../auth/dto/current-user.dto';
@Controller('teacher')
@UseGuards(RolesGuard)
@Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
export class TeacherPortalController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('classes')
  async getClassesOverview(@CurrentUser() user: CurrentUserDto) {
    return this.teacherService.getClassesOverview(user.id);
  }

  // The commerce-spine counterpart to `classes` above: cohorts this teacher
  // leads or teaches via CourseTeacher. Kept separate because a section is
  // marked present per day and a batch per session.
  @Get('batches')
  async getMyBatches(@CurrentUser() user: CurrentUserDto) {
    return this.teacherService.getMyBatches(user.id);
  }

  @Get('alerts')
  async getPerformanceAlerts(@CurrentUser() user: CurrentUserDto) {
    return this.teacherService.getPerformanceAlerts(user.id);
  }
}
