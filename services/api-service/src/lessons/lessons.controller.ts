import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  UpdateLessonDto,
  UpdateCardDto,
  ReorderCardsDto,
} from './dto/lessons.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('lessons')
@UseGuards(RolesGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  async listLessons(
    @Query('conceptId') conceptId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.lessonsService.listLessons(
      conceptId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      search,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id/flow')
  async getLessonFlow(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.lessonsService.getLessonFlow(id, user.id);
  }

  @Post('cards/:cardId/submit')
  async submitCardResponse(
    @Param('cardId') cardId: string,
    @Body() body: SubmitCardResponseDto,
    @CurrentUser() user: CurrentUserDto,
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

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.updateLesson(id, dto);
  }

  @Patch('cards/:cardId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async updateCard(
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.lessonsService.updateCard(cardId, dto);
  }

  @Patch(':id/cards/reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async reorderCards(@Param('id') id: string, @Body() dto: ReorderCardsDto) {
    return this.lessonsService.reorderCards(id, dto);
  }

  @Delete('cards/:cardId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  async deleteCard(@Param('cardId') cardId: string) {
    return this.lessonsService.deleteCard(cardId);
  }
}
