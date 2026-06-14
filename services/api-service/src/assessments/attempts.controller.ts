import {
  Body,
  Controller,
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
  CreateAttemptDto,
  ListAttemptsQueryDto,
  MarkAttemptDto,
  UpdateAttemptDto,
} from './dto/assessments.dto';
import { AttemptsService } from './attempts.service';

@Controller()
@UseGuards(CsrfGuard, PermissionsGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Get('attempts')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAttempts(@Query() query: ListAttemptsQueryDto) {
    return this.attemptsService.listAttempts(query);
  }

  @Get('attempts/:id')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async getAttempt(@Param('id') id: string) {
    return this.attemptsService.getAttempt(id);
  }

  @Post('attempts')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async startAttempt(@Body() body: CreateAttemptDto, @CurrentUser() user: any) {
    return this.attemptsService.startAttempt(body, user.id);
  }

  @Put('attempts/:id')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async updateAttempt(
    @Param('id') id: string,
    @Body() body: UpdateAttemptDto,
    @CurrentUser() user: any,
  ) {
    return this.attemptsService.updateAttempt(id, body, user.id);
  }

  @Post('attempts/:id/submit')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async submitAttempt(@Param('id') id: string, @CurrentUser() user: any) {
    return this.attemptsService.submitAttempt(id, user.id);
  }

  @Post('attempts/:id/mark')
  @RequirePermissions({ action: 'mark', subject: 'Assessment' })
  async markAttempt(
    @Param('id') id: string,
    @Body() body: MarkAttemptDto,
    @CurrentUser() user: any,
  ) {
    return this.attemptsService.markAttempt(id, body, user.id);
  }

  @Get('students/:id/attempts')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listStudentAttempts(
    @Param('id') id: string,
    @Query() query: ListAttemptsQueryDto,
  ) {
    return this.attemptsService.listAttempts({ ...query, studentProfileId: id });
  }

  @Get('assignments/:id/attempts')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAssignmentAttempts(
    @Param('id') id: string,
    @Query() query: ListAttemptsQueryDto,
  ) {
    return this.attemptsService.listAttempts({
      ...query,
      assessmentAssignmentId: id,
    });
  }
}
