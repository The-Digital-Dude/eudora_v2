import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { parseCookieHeader } from '../utils/cookies';
import { getJwtSecret } from '../utils/jwt-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          if (req && req.headers && req.headers.cookie) {
            const cookies = parseCookieHeader(req.headers.cookie);
            return cookies['access_token'];
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
    });
  }

  async validate(payload: any) {
    // Access and refresh tokens are signed with the same secret and are
    // distinguished only by the `typ` claim. Reject anything that is not an
    // access token so a long-lived refresh token cannot be replayed as a
    // bearer credential against protected routes.
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => ({
        action: rp.permission.action,
        subject: rp.permission.subject,
      })),
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
      guardianProfile: user.guardianProfile,
      studentProfile: user.studentProfile,
      // Reflects the csrf claim minted onto this access token back to the
      // client — cross-origin, the client cannot read the csrf_token cookie
      // itself via document.cookie, so /auth/me is how it recovers the value
      // on every page load, not just at login.
      csrfToken: payload.csrf,
    };
  }
}
