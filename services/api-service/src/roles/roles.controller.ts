import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('roles')
@UseGuards(RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':id/permissions')
  @Roles('SUPER_ADMIN')
  async assignPermission(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    return this.rolesService.assignPermission(id, dto.permissionId);
  }

  @Delete(':id/permissions/:permissionId')
  @Roles('SUPER_ADMIN')
  async removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.rolesService.removePermission(id, permissionId);
  }
}
