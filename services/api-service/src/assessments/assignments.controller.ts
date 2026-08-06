import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import {
  CreateAssignmentDto,
  ListAssignmentsQueryDto,
  UpdateAssignmentDto,
} from './dto/assessments.dto';
import { AssignmentsService } from './assignments.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { GuardianAccessService } from '../family/guardian-access.service';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller()
@UseGuards(CsrfGuard, PermissionsGuard)
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  @Get('assignments')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAssignments(@Query() query: ListAssignmentsQueryDto) {
    return this.assignmentsService.listAssignments(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('assignments/:id')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async getAssignment(@Param('id') id: string) {
    return this.assignmentsService.getAssignment(id);
  }

  @Post('assignments')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async createAssignment(
    @Body() body: CreateAssignmentDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assignmentsService.createAssignment(body, user.id);
  }

  @Put('assignments/:id')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async updateAssignment(
    @Param('id') id: string,
    @Body() body: UpdateAssignmentDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assignmentsService.updateAssignment(id, body, user.id);
  }

  @Delete('assignments/:id')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async cancelAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assignmentsService.cancelAssignment(id, user.id);
  }

  @Post('assignments/:id/remind')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async remindAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assignmentsService.remindAssignment(id, user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('students/:id/assignments')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listStudentAssignments(
    @Param('id') id: string,
    @Query() query: ListAssignmentsQueryDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    await this.guardianAccessService.assertCanAccessStudentRecord(user, id);
    return this.assignmentsService.listAssignments({
      ...query,
      studentProfileId: id,
    });
  }

  @Get('classes/:id/assignments')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listClassAssignments(
    @Param('id') id: string,
    @Query() query: ListAssignmentsQueryDto,
  ) {
    return this.assignmentsService.listAssignments({
      ...query,
      classSectionId: id,
    });
  }
}
