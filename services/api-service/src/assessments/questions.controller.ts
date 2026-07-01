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
  AddAssessmentQuestionDto,
  CreateQuestionDto,
  ListQuestionsQueryDto,
  UpdateAssessmentQuestionDto,
  UpdateQuestionDto,
} from './dto/assessments.dto';
import { QuestionsService } from './questions.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller()
@UseGuards(CsrfGuard, PermissionsGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('questions')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listQuestions(@Query() query: ListQuestionsQueryDto) {
    return this.questionsService.listQuestions(query);
  }

  @Get('questions/:id')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async getQuestion(@Param('id') id: string) {
    return this.questionsService.getQuestion(id);
  }

  @Post('questions')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async createQuestion(
    @Body() body: CreateQuestionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.questionsService.createQuestion(body, user.id);
  }

  @Put('questions/:id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateQuestion(
    @Param('id') id: string,
    @Body() body: UpdateQuestionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.questionsService.updateQuestion(id, body, user.id);
  }

  @Delete('questions/:id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async archiveQuestion(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.questionsService.archiveQuestion(id, user.id);
  }

  @Post('assessments/:id/questions')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async addQuestionToAssessment(
    @Param('id') id: string,
    @Body() body: AddAssessmentQuestionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.questionsService.addQuestionToAssessment(id, body, user.id);
  }

  @Delete('assessments/:assessmentId/questions/:questionId')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async removeQuestionFromAssessment(
    @Param('assessmentId') assessmentId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.questionsService.removeQuestionFromAssessment(
      assessmentId,
      questionId,
      user.id,
    );
  }

  @Put('assessments/:assessmentId/questions/:questionId')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateAssessmentQuestion(
    @Param('assessmentId') assessmentId: string,
    @Param('questionId') questionId: string,
    @Body() body: UpdateAssessmentQuestionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.questionsService.updateAssessmentQuestion(
      assessmentId,
      questionId,
      body,
      user.id,
    );
  }
}
