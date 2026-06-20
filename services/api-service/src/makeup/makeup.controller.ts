import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MakeupService } from './makeup.service';
import {
  CreateMakeupRequestDto,
  UpdateMakeupRequestDto,
} from './dto/makeup.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('makeup-requests')
@UseGuards(RolesGuard)
export class MakeupController {
  constructor(private readonly makeupService: MakeupService) {}

  @Post()
  @RequirePermissions({ action: 'create', subject: 'MakeupRequest' })
  async create(@Body() dto: CreateMakeupRequestDto) {
    return this.makeupService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @RequirePermissions({ action: 'read', subject: 'MakeupRequest' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.makeupService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'MakeupRequest' })
  async findOne(@Param('id') id: string) {
    return this.makeupService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @RequirePermissions({ action: 'update', subject: 'MakeupRequest' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMakeupRequestDto,
  ) {
    return this.makeupService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ action: 'delete', subject: 'MakeupRequest' })
  async remove(@Param('id') id: string) {
    return this.makeupService.remove(id);
  }
}
