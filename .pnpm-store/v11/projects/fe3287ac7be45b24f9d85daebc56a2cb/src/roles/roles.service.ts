import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
    }));
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async create(dto: CreateRoleDto, actorUserId: string | null = null) {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    const role = await this.prisma.role.create({
      data: dto,
    });

    await this.audit.log({
      actorUserId,
      event: 'role.created',
      targetType: 'role',
      targetId: role.id,
      metadata: { name: role.name },
    });

    return role;
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actorUserId: string | null = null,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.name && dto.name !== role.name) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: dto.name },
      });
      if (existingRole) {
        throw new ConflictException('Role name is already in use');
      }
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      actorUserId,
      event: 'role.updated',
      targetType: 'role',
      targetId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return updatedRole;
  }

  async delete(id: string, actorUserId: string | null = null) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    await this.audit.log({
      actorUserId,
      event: 'role.deleted',
      targetType: 'role',
      targetId: id,
      metadata: { name: role.name },
    });

    return { message: 'Role deleted successfully' };
  }

  async assignPermission(
    roleId: string,
    permissionId: string,
    actorUserId: string | null = null,
  ) {
    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: roleId } }),
      this.prisma.permission.findUnique({ where: { id: permissionId } }),
    ]);

    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const existingRolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    if (existingRolePermission) {
      throw new ConflictException('Role already has this permission');
    }

    await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
    });

    await this.audit.log({
      actorUserId,
      event: 'role.permission.assigned',
      targetType: 'role',
      targetId: roleId,
      metadata: {
        permissionId,
        permission: `${permission.action}:${permission.subject}`,
      },
    });

    return {
      message: `Permission '${permission.action}:${permission.subject}' assigned to role successfully`,
    };
  }

  async removePermission(
    roleId: string,
    permissionId: string,
    actorUserId: string | null = null,
  ) {
    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: roleId } }),
      this.prisma.permission.findUnique({ where: { id: permissionId } }),
    ]);

    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const existingRolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    if (!existingRolePermission) {
      throw new NotFoundException('Role does not have this permission');
    }

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    await this.audit.log({
      actorUserId,
      event: 'role.permission.removed',
      targetType: 'role',
      targetId: roleId,
      metadata: {
        permissionId,
        permission: `${permission.action}:${permission.subject}`,
      },
    });

    return {
      message: `Permission '${permission.action}:${permission.subject}' removed from role successfully`,
    };
  }
}
