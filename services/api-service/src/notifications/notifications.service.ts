import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceTokensService } from '../device-tokens/device-tokens.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { EmailService } from './email.service';
import { ExpoPushService } from './expo-push.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly deviceTokensService: DeviceTokensService,
    private readonly expoPushService: ExpoPushService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        metadata: dto.metadata || undefined,
      },
      include: {
        user: true,
      },
    });

    // Send email notification
    if (notification.user && notification.user.email) {
      await this.emailService
        .sendMail(notification.user.email, dto.title, dto.body)
        .catch((err) => {
          console.error('Failed to send notification email', err);
        });
    }

    // Push, same fire-and-forget treatment as email above — every existing
    // caller of `create()` (homework/grade alerts, guardian messaging) gets
    // push for free rather than each needing its own trigger wiring.
    await this.deviceTokensService
      .getTokensForUser(dto.userId)
      .then((tokens) =>
        this.expoPushService.sendToTokens(tokens, {
          title: dto.title,
          body: dto.body,
          data: { notificationId: notification.id, ...(dto.metadata as object) },
        }),
      )
      .catch((err) => {
        console.error('Failed to send push notification', err);
      });

    return notification;
  }

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { success: true };
  }
}
