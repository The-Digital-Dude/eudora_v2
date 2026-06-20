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
    @CurrentUser() user: any,
  ) {
    return this.assessmentSetupService.createAssessmentType(body, user.id);
  }

  @Put('types/:id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateAssessmentType(
    @Param('id') id: string,
    @Body() body: UpdateLookupDto,
    @CurrentUser() user: any,
  ) {
    return this.assessmentSetupService.updateAssessmentType(id, body, user.id);
  }

  @Get('levels')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listLevels(@Query() query: LookupQueryDto) {
    return this.assessmentSetupService.listLevels(query);
  }

  @Post('levels')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async createLevel(@Body() body: CreateLookupDto, @CurrentUser() user: any) {
    return this.assessmentSetupService.createLevel(body, user.id);
  }

  @Put('levels/:id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateLevel(
    @Param('id') id: string,
    @Body() body: UpdateLookupDto,
    @CurrentUser() user: any,
  ) {
    return this.assessmentSetupService.updateLevel(id, body, user.id);
  }

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
    @CurrentUser() user: any,
  ) {
    return this.assessmentSetupService.createAssessment(body, user.id);
  }

  @Put(':id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateAssessment(
    @Param('id') id: string,
    @Body() body: UpdateAssessmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assessmentSetupService.updateAssessment(id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async archiveAssessment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.assessmentSetupService.archiveAssessment(id, user.id);
  }

  @Post(':id/publish')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async publishAssessment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.assessmentSetupService.publishAssessment(id, user.id);
  }
}
