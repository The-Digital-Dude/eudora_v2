import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('snapshot')
  async getSnapshot(@Query() query: DashboardQueryDto, @CurrentUser() user: any) {
    const date = query.date ? new Date(query.date) : new Date();
    const targetDate = isNaN(date.getTime()) ? new Date() : date;

    const rolesList: string[] = [];
    if (user.role) rolesList.push(user.role);
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (typeof r === 'string') rolesList.push(r);
        else if (r?.name) rolesList.push(r.name);
        else if (r?.role?.name) rolesList.push(r.role?.name);
      });
    }

    if (rolesList.includes('SUPER_ADMIN') || rolesList.includes('ADMIN')) {
      return this.dashboardService.getAdminSnapshot(targetDate);
    } else if (rolesList.includes('TEACHER')) {
      return this.dashboardService.getTeacherSnapshot(user.id, targetDate);
    } else if (rolesList.includes('USER')) {
      return this.dashboardService.getStudentSnapshot(user.id, targetDate);
    } else if (rolesList.includes('GUARDIAN')) {
      return this.dashboardService.getGuardianSnapshot(user.id, targetDate);
    }

    throw new ForbiddenException('User has no authorized academic role assigned');
  }
}
