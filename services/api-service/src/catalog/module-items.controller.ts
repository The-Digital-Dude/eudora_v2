import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ModuleItemsService } from './module-items.service';
import {
  CreateModuleItemDto,
  UpdateModuleItemDto,
  UpdateModuleItemProgressDto,
  CreateDiscussionPostDto,
} from './dto/module-item.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('catalog/module-items')
@UseGuards(RolesGuard)
export class ModuleItemsController {
  constructor(private readonly moduleItemsService: ModuleItemsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  createModuleItem(@Body() dto: CreateModuleItemDto) {
    return this.moduleItemsService.createModuleItem(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  updateModuleItem(@Param('id') id: string, @Body() dto: UpdateModuleItemDto) {
    return this.moduleItemsService.updateModuleItem(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  deleteModuleItem(@Param('id') id: string) {
    return this.moduleItemsService.deleteModuleItem(id);
  }

  @Post(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateModuleItemProgressDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.moduleItemsService.upsertProgress(id, user.id, dto);
  }

  @Get(':id/my-assignment')
  getMyAssignmentForItem(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.moduleItemsService.getMyAssignmentForItem(id, user.id);
  }

  @Get(':id/discussion')
  getDiscussion(@Param('id') id: string) {
    return this.moduleItemsService.getDiscussion(id);
  }

  @Post(':id/discussion/posts')
  addDiscussionPost(
    @Param('id') id: string,
    @Body() dto: CreateDiscussionPostDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.moduleItemsService.addDiscussionPost(id, user.id, dto);
  }
}
