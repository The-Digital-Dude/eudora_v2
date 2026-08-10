import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 10, search?: string, roleName?: string) {
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleName) {
      where.roles = { some: { role: { name: roleName } } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((user) => ({
      ...user,
      roles: user.roles.map((ur) => ur.role),
    }));

    return {
      data: formattedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...result } = user;
    const formattedRoles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
      permissions: ur.role.permissions.map((rp) => rp.permission),
    }));

    return {
      ...result,
      roles: formattedRoles,
    };
  }

  async update(id: string, dto: UpdateUserDto, actorUserId: string | null = null) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorUserId,
      event: 'user.updated',
      targetType: 'user',
      targetId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return updatedUser;
  }

  async softDelete(id: string, actorUserId: string | null = null) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      actorUserId,
      event: 'user.deleted',
      targetType: 'user',
      targetId: id,
    });

    return { message: 'User deleted successfully' };
  }

  async assignRole(
    userId: string,
    roleId: string,
    actorUserId: string | null = null,
  ) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const existingUserRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    if (existingUserRole) {
      throw new ConflictException('User already has this role');
    }

    await this.prisma.userRole.create({
      data: { userId, roleId },
    });

    await this.audit.log({
      actorUserId,
      event: 'user.role.assigned',
      targetType: 'user',
      targetId: userId,
      metadata: { roleId, roleName: role.name },
    });

    return { message: `Role '${role.name}' assigned to user successfully` };
  }

  async removeRole(
    userId: string,
    roleId: string,
    actorUserId: string | null = null,
  ) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const existingUserRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    if (!existingUserRole) {
      throw new NotFoundException('User does not have this role');
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    await this.audit.log({
      actorUserId,
      event: 'user.role.removed',
      targetType: 'user',
      targetId: userId,
      metadata: { roleId, roleName: role.name },
    });

    return { message: `Role '${role.name}' removed from user successfully` };
  }
}
