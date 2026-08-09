import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@Injectable()
export class DeviceTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert on `token`, not `(userId, token)` — Expo push tokens are per
   * install, not per account. A shared/handed-down device logging into a
   * different account re-points the same token rather than creating a
   * stale duplicate row still pointed at the old user.
   */
  async register(userId: string, dto: RegisterDeviceTokenDto) {
    return this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform: dto.platform },
      update: { userId, platform: dto.platform },
    });
  }

  async unregister(userId: string, token: string) {
    const existing = await this.prisma.deviceToken.findFirst({
      where: { token, userId },
    });
    if (!existing) {
      throw new NotFoundException('Device token not found');
    }
    await this.prisma.deviceToken.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return rows.map((r) => r.token);
  }
}
