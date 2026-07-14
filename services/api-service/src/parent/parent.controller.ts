import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ParentService } from './parent.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { GuardianScopeGuard } from '../auth/guards/guardian-scope.guard';

@Controller('parent')
@UseGuards(RolesGuard)
@Roles('GUARDIAN', 'ADMIN', 'SUPER_ADMIN')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('children')
  async getChildren(@CurrentUser() user: CurrentUserDto) {
    return this.parentService.getChildren(user.id);
  }

  @Get('children/:studentProfileId/teachers')
  @UseGuards(GuardianScopeGuard)
  async getChildTeachers(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildTeachers(studentProfileId);
  }

  @Get('children/:studentProfileId/attendance')
  @UseGuards(GuardianScopeGuard)
  async getChildAttendance(
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.parentService.getChildAttendance(studentProfileId);
  }

  @Get('children/:studentProfileId/homework')
  @UseGuards(GuardianScopeGuard)
  async getChildHomework(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildHomework(studentProfileId);
  }

  @Get('children/:studentProfileId/grades')
  @UseGuards(GuardianScopeGuard)
  async getChildGrades(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildGrades(studentProfileId);
  }

  @Get('children/:studentProfileId/learning')
  @UseGuards(GuardianScopeGuard)
  async getChildLearning(@Param('studentProfileId') studentProfileId: string) {
    return this.parentService.getChildLearning(studentProfileId);
  }

  @Get('billing/invoices')
  async getInvoices(@CurrentUser() user: CurrentUserDto) {
    return this.parentService.getInvoices(user.id);
  }

  @Get('billing/payments')
  async getPayments(@CurrentUser() user: CurrentUserDto) {
    return this.parentService.getPayments(user.id);
  }
}
