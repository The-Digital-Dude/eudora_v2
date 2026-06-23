import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateThreadDto, CreateMessageDto } from './dto/message.dto';

@Controller('messages')
@UseGuards(RolesGuard)
@Roles('GUARDIAN', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('threads')
  async getThreads(@CurrentUser() user: any) {
    return this.messagingService.getThreads(user.id);
  }

  @Post('threads')
  async createThread(@CurrentUser() user: any, @Body() dto: CreateThreadDto) {
    return this.messagingService.createThread(user.id, dto);
  }

  @Get('threads/:id')
  async getThreadById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.messagingService.getThreadById(user.id, id);
  }

  @Post('threads/:id')
  async postMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagingService.postMessage(user.id, id, dto);
  }

  @Post('threads/:id/read')
  @HttpCode(HttpStatus.OK)
  async markThreadRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.messagingService.markThreadRead(user.id, id);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    return this.messagingService.getUnreadCount(user.id);
  }
}
