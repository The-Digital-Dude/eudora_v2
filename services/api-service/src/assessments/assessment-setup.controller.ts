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
  CreateAssessmentDto,
  CreateLookupDto,
  ListAssessmentsQueryDto,
  LookupQueryDto,
  UpdateAssessmentDto,
  UpdateLookupDto,
} from './dto/assessments.dto';
import { AssessmentSetupService } from './assessment-setup.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('assessments')
@UseGuards(CsrfGuard, PermissionsGuard)
export class AssessmentSetupController {
  constructor(
    private readonly assessmentSetupService: AssessmentSetupService,
  ) {}

  @Get('types')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAssessmentTypes(@Query() query: LookupQueryDto) {
    return this.assessmentSetupService.listAssessmentTypes(query);
  }

  @Post('types')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async createAssessmentType(
    @Body() body: CreateLookupDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assessmentSetupService.createAssessmentType(body, user.id);
  }

  @Put('types/:id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateAssessmentType(
    @Param('id') id: string,
    @Body() body: UpdateLookupDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assessmentSetupService.updateAssessmentType(id, body, user.id);
  }

  // Class (grade level) CRUD used to live here, back when it was the `Level`
  // lookup that only assessments used. It is now the taxonomy master and has
  // its own module at /api/classes.

  @Get()
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAssessments(@Query() query: ListAssessmentsQueryDto) {
    return this.assessmentSetupService.listAssessments(query);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async getAssessment(@Param('id') id: string) {
    return this.assessmentSetupService.getAssessment(id);
  }

  @Post()
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async createAssessment(
    @Body() body: CreateAssessmentDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assessmentSetupService.createAssessment(body, user.id);
  }

  @Put(':id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateAssessment(
    @Param('id') id: string,
    @Body() body: UpdateAssessmentDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assessmentSetupService.updateAssessment(id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async archiveAssessment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assessmentSetupService.archiveAssessment(id, user.id);
  }

  @Post(':id/publish')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async publishAssessment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.assessmentSetupService.publishAssessment(id, user.id);
  }
}
