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
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('leads')
@UseGuards(RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @RequirePermissions({ action: 'create', subject: 'Lead' })
  async create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'read', subject: 'Lead' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.leadsService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'Lead' })
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'update', subject: 'Lead' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ action: 'delete', subject: 'Lead' })
  async remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
