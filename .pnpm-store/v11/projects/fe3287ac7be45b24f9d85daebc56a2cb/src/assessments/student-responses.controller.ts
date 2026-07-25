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
  ListResponsesQueryDto,
  MarkStudentResponseDto,
  SaveStudentResponseDto,
  UpdateStudentResponseDto,
} from './dto/assessments.dto';
import { StudentResponsesService } from './student-responses.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller()
@UseGuards(CsrfGuard, PermissionsGuard)
export class StudentResponsesController {
  constructor(
    private readonly studentResponsesService: StudentResponsesService,
  ) {}

  @Get('responses')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listResponses(@Query() query: ListResponsesQueryDto) {
    return this.studentResponsesService.listResponses(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Get('responses/:id')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async getResponse(@Param('id') id: string) {
    return this.studentResponsesService.getResponse(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Post('responses')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async saveResponse(
    @Body() body: SaveStudentResponseDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.studentResponsesService.saveResponse(body, user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Put('responses/:id')
  @RequirePermissions({ action: 'attempt', subject: 'Assessment' })
  async updateResponse(
    @Param('id') id: string,
    @Body() body: UpdateStudentResponseDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.studentResponsesService.updateResponse(id, body, user.id);
  }

  @Post('responses/:id/mark')
  @RequirePermissions({ action: 'mark', subject: 'Assessment' })
  async markResponse(
    @Param('id') id: string,
    @Body() body: MarkStudentResponseDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.studentResponsesService.markResponse(id, body, user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER')
  @Get('attempts/:id/responses')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listAttemptResponses(
    @Param('id') id: string,
    @Query() query: ListResponsesQueryDto,
  ) {
    return this.studentResponsesService.listResponses({
      ...query,
      assessmentAttemptId: id,
    });
  }

  @Get('questions/:id/responses')
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listQuestionResponses(
    @Param('id') id: string,
    @Query() query: ListResponsesQueryDto,
  ) {
    return this.studentResponsesService.listResponses({
      ...query,
      questionId: id,
    });
  }
}
