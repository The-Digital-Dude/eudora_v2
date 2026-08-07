import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizedOAuthProfile, resolveSelfSignupRole } from './oauth/types';
import { GoogleOAuthProvider } from './oauth/providers/google.provider';
import { AppleOAuthProvider } from './oauth/providers/apple.provider';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

/**
 * How long a just-rotated refresh token stays acceptable. Long enough to cover
 * a retried request or an app resuming mid-refresh, short enough that a stolen
 * token is not meaningfully more useful for having this window.
 */
const REFRESH_ROTATION_GRACE_MS = 60 * 1000;

@Injectable()
export class AuthService {
  /** Relations every session-issuing path needs loaded on the user. */
  private static readonly USER_SESSION_INCLUDE = {
    roles: {
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    },
    guardianProfile: { include: { students: true } },
    studentProfile: true,
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleProvider: GoogleOAuthProvider,
    private readonly appleProvider: AppleOAuthProvider,
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
      throw new ConflictException(
        'Default role USER does not exist. Please seed the database.',
      );
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

    const { password: _, ...result } = user;
    return {
      user: result,
      tokens,
    };
  }

  async login(
    dto: LoginDto,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
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
        guardianProfile: {
          include: {
            students: true,
          },
        },
        studentProfile: true,
      },
    });

    if (!user || user.deletedAt) {
      await this.audit(
        null,
        'auth.login.failed',
        'user',
        null,
        ipAddress,
        userAgent,
        { email },
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.audit(
        user.id,
        'auth.login.inactive',
        'user',
        user.id,
        ipAddress,
        userAgent,
        { email },
      );
      throw new UnauthorizedException('Account is not active');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit(
        user.id,
        'auth.login.locked',
        'user',
        user.id,
        ipAddress,
        userAgent,
        { email },
      );
      throw new ForbiddenException('Account is temporarily locked');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account has no password. Please sign in with your linked provider.',
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      const nextFailedLoginCount = user.failedLoginCount + 1;
      const shouldLock = nextFailedLoginCount >= 5;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextFailedLoginCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null,
        },
      });
      await this.audit(
        user.id,
        'auth.login.failed',
        'user',
        user.id,
        ipAddress,
        userAgent,
        { email },
      );
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
        guardianProfile: {
          include: {
            students: true,
          },
        },
        studentProfile: true,
      },
    });

    const tokens = await this.createSessionTokens(
      updatedUser,
      userAgent ?? null,
      ipAddress ?? null,
    );
    await this.audit(
      user.id,
      'auth.login.success',
      'user',
      user.id,
      ipAddress ?? null,
      userAgent ?? null,
    );

    const { password, ...result } = updatedUser;
    return {
      user: result,
      tokens,
    };
  }

  /**
   * Mints a session for a user who has already been verified through some
   * other means (currently: device-code pairing, approved from an
   * already-authenticated phone session). Deliberately reuses
   * createSessionTokens rather than duplicating token-minting logic — the
   * "how did we verify identity" step is the only thing that differs from
   * password login.
   */
  async mintSessionForVerifiedUser(
    userId: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
        guardianProfile: {
          include: {
            students: true,
          },
        },
        studentProfile: true,
      },
    });

    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('Account is not available');
    }

    const tokens = await this.createSessionTokens(
      user,
      userAgent ?? null,
      ipAddress ?? null,
    );
    const { password, ...result } = user;
    return {
      user: result,
      tokens,
    };
  }

  async loginWithGoogle(
    dto: GoogleLoginDto,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    const profile = await this.googleProvider.verify(dto.token);
    return this.linkOrCreateOAuthUser(profile, dto.role, userAgent, ipAddress);
  }

  /**
   * Builds the Apple authorization URL and the state that protects it.
   *
   * State is a signed JWT carrying a nonce plus the role hint. The nonce is
   * also set as a cookie, so the callback can confirm the response belongs to
   * the browser that started the flow — a signature alone would not stop an
   * attacker replaying their own valid state to log a victim into the
   * attacker's account.
   */
  buildAppleAuthorization(roleHint?: string | null): {
    url: string;
    nonce: string;
  } {
    const nonce = crypto.randomBytes(32).toString('hex');
    const state = this.jwtService.sign(
      { typ: 'apple_state', nonce, roleHint: roleHint ?? null },
      { expiresIn: '10m' },
    );
    return { url: this.appleProvider.buildAuthorizationUrl(state), nonce };
  }

  async loginWithApple(
    params: {
      code: string;
      state: string;
      user?: string;
      cookieNonce?: string;
    },
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    let statePayload: {
      typ?: string;
      nonce?: string;
      roleHint?: string | null;
    };
    try {
      statePayload = this.jwtService.verify(params.state);
    } catch {
      throw new UnauthorizedException('Invalid or expired Apple sign-in state');
    }

    if (statePayload.typ !== 'apple_state' || !statePayload.nonce) {
      throw new UnauthorizedException('Invalid Apple sign-in state');
    }

    const expected = Buffer.from(statePayload.nonce);
    const received = Buffer.from(params.cookieNonce ?? '');
    // timingSafeEqual throws on a length mismatch, and the length is
    // attacker-controlled, so compare sizes first.
    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException(
        'Apple sign-in state did not match this browser session',
      );
    }

    const profile = await this.appleProvider.verifyCallback(
      params.code,
      params.user,
    );
    return this.linkOrCreateOAuthUser(
      profile,
      statePayload.roleHint,
      userAgent,
      ipAddress,
    );
  }

  /**
   * Shared tail of every OAuth sign-in, regardless of provider. Resolves the
   * verified profile to a user in one of three ways:
   *
   *   1. A UserIdentity already exists for (provider, sub) -> log that user in.
   *   2. No identity, but a user holds the same email -> link, but ONLY if the
   *      provider asserts the email is verified. Linking on an unverified email
   *      would let anyone who can get a provider to emit an arbitrary address
   *      take over an existing password account.
   *   3. Nothing matches -> create a user, but only for self-signup roles.
   */
  private async linkOrCreateOAuthUser(
    profile: NormalizedOAuthProfile,
    roleHint: string | null | undefined,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    const email = profile.email.trim().toLowerCase();
    const provider = profile.provider;
    const providerLabel = provider.toLowerCase();

    const identity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.providerUserId,
        },
      },
      select: { userId: true },
    });

    let user = identity
      ? await this.prisma.user.findUnique({
          where: { id: identity.userId },
          include: AuthService.USER_SESSION_INCLUDE,
        })
      : null;

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
        include: AuthService.USER_SESSION_INCLUDE,
      });

      if (existingByEmail) {
        if (!profile.emailVerified) {
          await this.audit(
            existingByEmail.id,
            `auth.link.${providerLabel}.rejected`,
            'user',
            existingByEmail.id,
            ipAddress,
            userAgent,
            { reason: 'email_not_verified', email },
          );
          throw new UnauthorizedException(
            'This email is already registered. Sign in with your password, then link this provider from account settings.',
          );
        }

        await this.prisma.userIdentity.create({
          data: {
            userId: existingByEmail.id,
            provider,
            providerUserId: profile.providerUserId,
            email,
            emailVerified: profile.emailVerified,
            isPrivateRelay: profile.isPrivateRelay ?? false,
            lastLoginAt: new Date(),
          },
        });
        await this.audit(
          existingByEmail.id,
          `auth.link.${providerLabel}`,
          'user',
          existingByEmail.id,
          ipAddress,
          userAgent,
        );
        user = existingByEmail;
      }
    }

    if (!user) {
      // New account. The role is resolved server-side from an allowlist; a
      // roleHint naming TEACHER/STAFF/ADMIN is ignored rather than honoured.
      const targetRole = resolveSelfSignupRole(roleHint);
      const dbRole = await this.prisma.role.findUnique({
        where: { name: targetRole },
      });
      if (!dbRole) {
        throw new ConflictException(
          `Role ${targetRole} does not exist in the database.`,
        );
      }

      user = await this.prisma.user.create({
        data: {
          email,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          roles: { create: { roleId: dbRole.id } },
          identities: {
            create: {
              provider,
              providerUserId: profile.providerUserId,
              email,
              emailVerified: profile.emailVerified,
              isPrivateRelay: profile.isPrivateRelay ?? false,
              lastLoginAt: new Date(),
            },
          },
        },
        include: AuthService.USER_SESSION_INCLUDE,
      });
      await this.audit(
        user.id,
        `auth.signup.${providerLabel}`,
        'user',
        user.id,
        ipAddress,
        userAgent,
      );
    } else {
      // Mirrors the password path: a deactivated or soft-deleted account must
      // not be reachable just because it holds a linked provider identity.
      if (user.deletedAt || !user.isActive) {
        await this.audit(
          user.id,
          `auth.login.${providerLabel}.inactive`,
          'user',
          user.id,
          ipAddress,
          userAgent,
        );
        throw new UnauthorizedException('Account is not active');
      }

      await this.prisma.userIdentity.updateMany({
        where: { userId: user.id, provider },
        data: { lastLoginAt: new Date() },
      });
      await this.audit(
        user.id,
        `auth.login.${providerLabel}`,
        'user',
        user.id,
        ipAddress,
        userAgent,
      );
    }

    const tokens = await this.createSessionTokens(
      user,
      userAgent ?? null,
      ipAddress ?? null,
    );

    const { password: _, ...result } = user;
    return { user: result, tokens };
  }

  async refreshSession(
    refreshToken: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const sessionUserInclude = {
      user: { include: AuthService.USER_SESSION_INCLUDE },
    };

    let session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: sessionUserInclude,
    });

    if (!session) {
      // The hash matches no *current* session, but it may be the one we rotated
      // away moments ago. A client whose refresh request was retried — dropped
      // response, app resumed mid-flight, two tabs racing — legitimately holds
      // that token. Honour it briefly rather than treating it as theft, because
      // the containment below logs the user out of every device they own.
      session = await this.prisma.authSession.findFirst({
        where: {
          previousRefreshTokenHash: refreshTokenHash,
          userId: payload.sub,
          revokedAt: null,
          rotatedAt: {
            gte: new Date(Date.now() - REFRESH_ROTATION_GRACE_MS),
          },
        },
        include: sessionUserInclude,
      });

      if (session) {
        await this.audit(
          payload.sub,
          'auth.refresh.grace_reuse',
          'user',
          payload.sub,
          ipAddress,
          userAgent,
        );
      }
    }

    if (!session) {
      // The token is validly signed (verified above) but its hash matches no
      // stored session — it was already rotated out. This is a strong signal
      // of refresh-token reuse (theft), so revoke every active session for the
      // user as a containment measure. Only genuinely-issued tokens can reach
      // here, since an attacker cannot sign a token without the secret.
      await this.prisma.authSession.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: 'refresh_reuse_detected',
        },
      });
      await this.audit(
        payload.sub,
        'auth.refresh.reuse_detected',
        'user',
        payload.sub,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Refresh session is not active');
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh session is not active');
    }

    if (!session.user.isActive || session.user.deletedAt) {
      throw new ForbiddenException('Account is not active');
    }

    const roles = session.user.roles.map((ur: any) => ur.role.name);

    const accessPayload = {
      sub: session.user.id,
      email: session.user.email,
      roles,
      typ: 'access',
    };

    const refreshPayload = {
      sub: session.user.id,
      typ: 'refresh',
      // Same reason as the initial mint in createSessionTokens: iat only has
      // second granularity, so without jti two rotations within the same second
      // produce identical tokens and collide on the unique refreshTokenHash.
      jti: crypto.randomUUID(),
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
    const newRefreshTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        previousRefreshTokenHash: session.refreshTokenHash,
        rotatedAt: new Date(),
        userAgent: userAgent ?? session.userAgent,
        ipAddress: ipAddress ?? session.ipAddress,
        expiresAt: new Date(Date.now() + refreshTokenExpiresInSeconds * 1000),
      },
    });

    await this.audit(
      session.user.id,
      'auth.refresh.rotated',
      'user',
      session.user.id,
      ipAddress,
      userAgent,
    );

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

  async logout(
    refreshToken: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

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

    await this.audit(
      session.userId,
      'auth.logout',
      'user',
      session.userId,
      ipAddress,
      userAgent,
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('User is unavailable');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Users registered via Google do not have a local password.',
      );
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

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

    // Invalidate every existing session so a hijacked session cannot outlive
    // the password change.
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'password_changed' },
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

  private async createSessionTokens(
    user: any,
    userAgent: string | null,
    ipAddress: string | null,
  ) {
    const roles = user.roles.map((ur: any) => ur.role.name);

    const accessPayload = {
      sub: user.id,
      email: user.email,
      roles,
      typ: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      typ: 'refresh',
      // jti keeps concurrent logins from minting identical tokens (iat has
      // second granularity), which would collide on AuthSession.refreshTokenHash.
      jti: crypto.randomUUID(),
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
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

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
