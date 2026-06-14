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
import {
  CreateAssignmentDto,
  ListAssignmentsQueryDto,
  UpdateAssignmentDto,
} from './dto/assessments.dto';
import { AssignmentsService } from './assignments.service';

@Controller()
@UseGuards(CsrfGuard, PermissionsGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('assignments')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAssignments(@Query() query: ListAssignmentsQueryDto) {
    return this.assignmentsService.listAssignments(query);
  }

  @Get('assignments/:id')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async getAssignment(@Param('id') id: string) {
    return this.assignmentsService.getAssignment(id);
  }

  @Post('assignments')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async createAssignment(
    @Body() body: CreateAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.createAssignment(body, user.id);
  }

  @Put('assignments/:id')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async updateAssignment(
    @Param('id') id: string,
    @Body() body: UpdateAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.updateAssignment(id, body, user.id);
  }

  @Delete('assignments/:id')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async cancelAssignment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.assignmentsService.cancelAssignment(id, user.id);
  }

  @Post('assignments/:id/remind')
  @RequirePermissions({ action: 'assign', subject: 'Assessment' })
  async remindAssignment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.assignmentsService.remindAssignment(id, user.id);
  }

  @Get('students/:id/assignments')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listStudentAssignments(
    @Param('id') id: string,
    @Query() query: ListAssignmentsQueryDto,
  ) {
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
