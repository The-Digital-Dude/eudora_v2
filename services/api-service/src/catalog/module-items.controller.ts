import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ModuleItemsService } from './module-items.service';
import { ACTING_STUDENT_HEADER } from '../entitlements/acting-student.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
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
  constructor(
    private readonly moduleItemsService: ModuleItemsService,
    private readonly entitlements: EntitlementsService,
  ) {}

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

  // Consumption routes below are entitlement-gated. Authoring routes above are
  // already staff-only, so they intentionally are not.

  @Post(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateModuleItemProgressDto,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    await this.assertItemAccess(id, user, actingStudentId);
    return this.moduleItemsService.upsertProgress(
      id,
      user.id,
      dto,
      actingStudentId,
    );
  }

  @Get(':id/my-session')
  async getMySessionForItem(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    await this.assertItemAccess(id, user, actingStudentId);
    return this.moduleItemsService.getMySessionForItem(
      id,
      user.id,
      actingStudentId,
    );
  }

  @Get(':id/my-assignment')
  async getMyAssignmentForItem(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    await this.assertItemAccess(id, user, actingStudentId);
    return this.moduleItemsService.getMyAssignmentForItem(id, user.id);
  }

  @Get(':id/my-homework')
  async getMyHomeworkForItem(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    await this.assertItemAccess(id, user, actingStudentId);
    return this.moduleItemsService.getMyHomeworkForItem(
      id,
      user.id,
      actingStudentId,
    );
  }

  @Get(':id/discussion')
  async getDiscussion(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    await this.assertItemAccess(id, user, actingStudentId);
    return this.moduleItemsService.getDiscussion(id);
  }

  @Post(':id/discussion/posts')
  async addDiscussionPost(
    @Param('id') id: string,
    @Body() dto: CreateDiscussionPostDto,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    await this.assertItemAccess(id, user, actingStudentId);
    return this.moduleItemsService.addDiscussionPost(id, user.id, dto);
  }

  private async assertItemAccess(
    id: string,
    user: CurrentUserDto,
    actingStudentId?: string | null,
  ) {
    const allowed = await this.entitlements.canAccessModuleItem(
      user.id,
      user.roles,
      id,
      actingStudentId ?? null,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'This content requires an active enrollment',
      );
    }
  }
}
