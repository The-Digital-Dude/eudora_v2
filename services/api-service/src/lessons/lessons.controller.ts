import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import {
  CreateLessonDto,
  CreateCardDto,
  SubmitCardResponseDto,
} from './dto/lessons.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('lessons')
@UseGuards(RolesGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  async listLessons(@Query('conceptId') conceptId?: string) {
    return this.lessonsService.listLessons(conceptId);
  }

  @Get(':id/flow')
  async getLessonFlow(@Param('id') id: string, @CurrentUser() user: any) {
    return this.lessonsService.getLessonFlow(id, user.id);
  }

  @Post('cards/:cardId/submit')
  async submitCardResponse(
    @Param('cardId') cardId: string,
    @Body() body: SubmitCardResponseDto,
    @CurrentUser() user: any,
  ) {
    return this.lessonsService.submitCardResponse(user.id, cardId, body);
  }

  // Admin and teacher-only capabilities for authoring lessons
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async createLesson(@Body() dto: CreateLessonDto) {
    return this.lessonsService.createLesson(dto);
  }

  @Post('cards')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async createCard(@Body() dto: CreateCardDto) {
    return this.lessonsService.createCard(dto);
  }
}
