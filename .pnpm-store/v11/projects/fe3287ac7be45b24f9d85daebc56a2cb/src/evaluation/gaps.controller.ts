import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { GapService } from './gap.service';
import { ListGapsQueryDto, UpdateGapDto } from './dto/gap.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('gaps')
@UseGuards(RolesGuard)
export class GapsController {
  constructor(private readonly gapService: GapService) {}

  @Get()
  @RequirePermissions({ action: 'read', subject: 'LearningGap' })
  listGaps(@Query() query: ListGapsQueryDto) {
    return this.gapService.listGaps(query);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'LearningGap' })
  getGapById(@Param('id') id: string) {
    return this.gapService.getGapById(id);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'update', subject: 'LearningGap' })
  updateGapStatus(@Param('id') id: string, @Body() dto: UpdateGapDto) {
    return this.gapService.updateGapStatus(id, dto);
  }
}
