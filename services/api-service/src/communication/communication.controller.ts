import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CreateBroadcastDto } from './dto/broadcast.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('communication')
@UseGuards(RolesGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post('broadcasts')
  async createBroadcast(@Body() dto: CreateBroadcastDto) {
    return this.communicationService.createBroadcast(dto);
  }

  @Get('broadcasts')
  async getBroadcasts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.communicationService.getBroadcasts(pageNum, limitNum);
  }
}
