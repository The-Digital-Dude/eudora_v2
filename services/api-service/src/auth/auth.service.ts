import { Injectable, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!defaultRole) {
      throw new ConflictException('Default role USER does not exist. Please seed the database.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: {
          create: {
            roleId: defaultRole.id,
          },
        },
      },
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

    const tokens = await this.createSessionTokens(user, null, null);
    await this.audit(user.id, 'auth.signup.created', 'user', user.id);

    const { password, ...result } = user;
    return {
      user: result,
      tokens,
    };
  }

  async login(dto: LoginDto, userAgent?: string | null, ipAddress?: string | null) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
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
      await this.audit(null, 'auth.login.failed', 'user', null, ipAddress, userAgent, { email });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.audit(user.id, 'auth.login.inactive', 'user', user.id, ipAddress, userAgent, { email });
      throw new UnauthorizedException('Account is not active');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit(user.id, 'auth.login.locked', 'user', user.id, ipAddress, userAgent, { email });
      throw new ForbiddenException('Account is temporarily locked');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      const nextFailedLoginCount = user.failedLoginCount + 1;
      const shouldLock = nextFailedLoginCount >= 5;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextFailedLoginCount,
          lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      await this.audit(user.id, 'auth.login.failed', 'user', user.id, ipAddress, userAgent, { email });
      throw new UnauthorizedException('Invalid email or password');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
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

    const tokens = await this.createSessionTokens(updatedUser, userAgent ?? null, ipAddress ?? null);
    await this.audit(user.id, 'auth.login.success', 'user', user.id, ipAddress ?? null, userAgent ?? null);

    const { password, ...result } = updatedUser;
    return {
      user: result,
      tokens,
    };
  }

  async refreshSession(refreshToken: string, userAgent?: string | null, ipAddress?: string | null) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: {
        user: {
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
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh session is not active');
    }

    if (!session.user.isActive || session.user.deletedAt) {
      throw new ForbiddenException('Account is not active');
    }

    const roles = session.user.roles.map((ur: any) => ur.role.name);
    const permissions = session.user.roles.flatMap((ur: any) =>
      ur.role.permissions.map((rp: any) => ({
        action: rp.permission.action,
        subject: rp.permission.subject,
      })),
    );

    const accessPayload = {
      sub: session.user.id,
      email: session.user.email,
      roles,
      permissions,
      typ: 'access',
    };

    const refreshPayload = {
      sub: session.user.id,
      typ: 'refresh',
    };

    const accessTokenExpiresInSeconds = 15 * 60;
    const refreshTokenExpiresInSeconds = 30 * 24 * 60 * 60;

    const newAccessToken = this.jwtService.sign(accessPayload, {
      expiresIn: accessTokenExpiresInSeconds,
    });
    const newRefreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshTokenExpiresInSeconds,
    });

    const newCsrfToken = crypto.randomBytes(32).toString('base64url');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        userAgent: userAgent ?? session.userAgent,
        ipAddress: ipAddress ?? session.ipAddress,
        expiresAt: new Date(Date.now() + refreshTokenExpiresInSeconds * 1000),
      },
    });

    await this.audit(session.user.id, 'auth.refresh.rotated', 'user', session.user.id, ipAddress, userAgent);

    const { password, ...userWithoutPassword } = session.user;

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        csrfToken: newCsrfToken,
        accessTokenExpiresInSeconds,
        refreshTokenExpiresInSeconds,
      },
    };
  }

  async logout(refreshToken: string, userAgent?: string | null, ipAddress?: string | null) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
    });

    if (!session || session.revokedAt) {
      return;
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        revokedReason: 'logout',
      },
    });

    await this.audit(session.userId, 'auth.logout', 'user', session.userId, ipAddress, userAgent);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('User is unavailable');
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    await this.audit(userId, 'auth.password.changed', 'user', userId);

    const { password, ...result } = updatedUser;
    return result;
  }

  async audit(
    actorUserId: string | null,
    event: string,
    targetType?: string | null,
    targetId?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
    metadata?: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        event,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  }

  private async createSessionTokens(user: any, userAgent: string | null, ipAddress: string | null) {
    const roles = user.roles.map((ur: any) => ur.role.name);
    const permissions = user.roles.flatMap((ur: any) =>
      ur.role.permissions.map((rp: any) => ({
        action: rp.permission.action,
        subject: rp.permission.subject,
      })),
    );

    const accessPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      typ: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      typ: 'refresh',
    };

    const accessTokenExpiresInSeconds = 15 * 60;
    const refreshTokenExpiresInSeconds = 30 * 24 * 60 * 60;

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: accessTokenExpiresInSeconds,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshTokenExpiresInSeconds,
    });

    const csrfToken = crypto.randomBytes(32).toString('base64url');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + refreshTokenExpiresInSeconds * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      csrfToken,
      accessTokenExpiresInSeconds,
      refreshTokenExpiresInSeconds,
    };
  }
}
