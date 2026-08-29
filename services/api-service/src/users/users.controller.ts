import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

@Roles('SUPER_ADMIN')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'read', subject: 'User' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.usersService.findAll(
      pageNum,
      limitNum,
      search,
      role,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'read', subject: 'User' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions({ action: 'update', subject: 'User' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: CurrentUserDto,
  ) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @RequirePermissions({ action: 'delete', subject: 'User' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserDto) {
    return this.usersService.softDelete(id, actor.id);
  }

  @Post(':id/roles')
  @Roles('SUPER_ADMIN')
  @RequirePermissions({ action: 'update', subject: 'User' })
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: CurrentUserDto,
  ) {
    return this.usersService.assignRole(id, dto.roleId, actor.id);
  }

  @Delete(':id/roles/:roleId')
  @Roles('SUPER_ADMIN')
  @RequirePermissions({ action: 'update', subject: 'User' })
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() actor: CurrentUserDto,
  ) {
    return this.usersService.removeRole(id, roleId, actor.id);
  }
}
