import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NextActionService } from './next-action.service';
import {
  CreateNextActionDto,
  ListNextActionsQueryDto,
  UpdateNextActionDto,
} from './dto/next-action.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('next-actions')
@UseGuards(RolesGuard)
export class NextActionsController {
  constructor(private readonly nextActionService: NextActionService) {}

  @Get()
  @RequirePermissions({ action: 'read', subject: 'NextAction' })
  listNextActions(@Query() query: ListNextActionsQueryDto) {
    return this.nextActionService.listNextActions(query);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'NextAction' })
  getNextActionById(@Param('id') id: string) {
    return this.nextActionService.getNextActionById(id);
  }

  @Post()
  @RequirePermissions({ action: 'create', subject: 'NextAction' })
  createNextAction(@Body() dto: CreateNextActionDto) {
    return this.nextActionService.createNextAction(dto);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'update', subject: 'NextAction' })
  updateNextAction(@Param('id') id: string, @Body() dto: UpdateNextActionDto) {
    return this.nextActionService.updateNextAction(id, dto);
  }
}
