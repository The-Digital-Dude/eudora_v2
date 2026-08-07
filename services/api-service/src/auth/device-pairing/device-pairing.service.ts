import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';

const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000;

function generateUserCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[crypto.randomInt(CODE_CHARSET.length)];
  }
  return code;
}

function hashDeviceCode(deviceCode: string): string {
  return crypto.createHash('sha256').update(deviceCode).digest('hex');
}

/**
 * OAuth-device-authorization-grant-shaped pairing: the TV has no usable
 * password entry and (on Fire TV) no Google Play Services for native
 * Google Sign-In, so it authenticates by displaying a short code that the
 * user approves from an already-logged-in phone session instead.
 */
@Injectable()
export class DevicePairingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Called by the TV app with no credentials. Returns a short user-facing
   * code (displayed on screen) and a separate long device code (kept by the
   * TV only, used to poll) — never the same value, so someone who merely
   * sees the on-screen code can't poll on the TV's behalf.
   */
  async start() {
    const code = generateUserCode();
    const deviceCode = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.devicePairingCode.create({
      data: {
        code,
        deviceCodeHash: hashDeviceCode(deviceCode),
        expiresAt,
      },
    });

    return {
      code,
      deviceCode,
      expiresIn: Math.floor(CODE_TTL_MS / 1000),
    };
  }

  /**
   * Called from the phone app, bearer-authenticated as the user who will
   * own the TV session. Only marks the code approved — the TV mints its own
   * tokens on its next poll, so this endpoint never sees or returns them.
   */
  async approve(userId: string, code: string) {
    const pairing = await this.prisma.devicePairingCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!pairing || pairing.status !== 'PENDING') {
      throw new NotFoundException('Pairing code not found or already used');
    }
    if (pairing.expiresAt < new Date()) {
      throw new BadRequestException('Pairing code has expired');
    }

    await this.prisma.devicePairingCode.update({
      where: { id: pairing.id },
      data: { status: 'APPROVED', userId },
    });

    return { approved: true };
  }

  /**
   * Called repeatedly by the TV app while the code is unresolved. Once
   * approved, mints a real session the same way any other login does and
   * consumes the pairing row so it can't be polled again.
   */
  async poll(
    deviceCode: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    const pairing = await this.prisma.devicePairingCode.findUnique({
      where: { deviceCodeHash: hashDeviceCode(deviceCode) },
    });

    if (!pairing) {
      throw new NotFoundException('Pairing session not found');
    }
    if (pairing.expiresAt < new Date() && pairing.status === 'PENDING') {
      await this.prisma.devicePairingCode.update({
        where: { id: pairing.id },
        data: { status: 'EXPIRED' },
      });
      return { status: 'expired' as const };
    }
    if (pairing.status === 'EXPIRED') {
      return { status: 'expired' as const };
    }
    if (pairing.status === 'PENDING') {
      return { status: 'pending' as const };
    }

    // APPROVED — mint the session, then delete the row so the (now-consumed)
    // device code can't be reused to mint a second session.
    const result = await this.authService.mintSessionForVerifiedUser(
      pairing.userId!,
      userAgent,
      ipAddress,
    );
    await this.prisma.devicePairingCode.delete({ where: { id: pairing.id } });

    return {
      status: 'approved' as const,
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.accessTokenExpiresInSeconds,
      refreshExpiresIn: result.tokens.refreshTokenExpiresInSeconds,
    };
  }
}
