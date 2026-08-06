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
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import {
  CreateAttemptDto,
  ListAttemptsQueryDto,
  MarkAttemptDto,
  UpdateAttemptDto,
} from './dto/assessments.dto';
import { AttemptsService } from './attempts.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { GuardianAccessService } from '../family/guardian-access.service';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller()
@UseGuards(CsrfGuard, PermissionsGuard)
export class AttemptsController {
  constructor(
    private readonly attemptsService: AttemptsService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  @Get('attempts')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAttempts(@Query() query: ListAttemptsQueryDto) {
    return this.attemptsService.listAttempts(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('attempts/:id')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async getAttempt(@Param('id') id: string) {
    return this.attemptsService.getAttempt(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Get('attempts/:id/questions')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async getAttemptQuestions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.attemptsService.getAttemptQuestions(id, user.id, user.roles);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Post('attempts')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async startAttempt(
    @Body() body: CreateAttemptDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.attemptsService.startAttempt(body, user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Put('attempts/:id')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async updateAttempt(
    @Param('id') id: string,
    @Body() body: UpdateAttemptDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.attemptsService.updateAttempt(id, body, user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Post('attempts/:id/submit')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async submitAttempt(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.attemptsService.submitAttempt(id, user.id);
  }

  @Post('attempts/:id/mark')
  @RequirePermissions({ action: 'mark', subject: 'Assessment' })
  async markAttempt(
    @Param('id') id: string,
    @Body() body: MarkAttemptDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.attemptsService.markAttempt(id, body, user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('students/:id/attempts')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listStudentAttempts(
    @Param('id') id: string,
    @Query() query: ListAttemptsQueryDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    await this.guardianAccessService.assertCanAccessStudentRecord(user, id);
    return this.attemptsService.listAttempts({
      ...query,
      studentProfileId: id,
    });
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
