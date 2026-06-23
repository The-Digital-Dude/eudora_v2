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

  @Get('alerts')
  async getPerformanceAlerts(@CurrentUser() user: CurrentUserDto) {
    return this.teacherService.getPerformanceAlerts(user.id);
  }
}
