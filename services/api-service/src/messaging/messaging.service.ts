import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateThreadDto, CreateMessageDto } from './dto/message.dto';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getThreads(userId: string) {
    const threads = await this.prisma.messageThread.findMany({
      where: {
        OR: [{ guardianUserId: userId }, { teacherUserId: userId }],
      },
      include: {
        studentProfile: {
          select: { id: true, fullName: true },
        },
        guardian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Compute unread counts for each thread
    const threadsWithUnread = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            threadId: thread.id,
            senderUserId: { not: userId },
            readAt: null,
          },
        });
        return {
          ...thread,
          unreadCount,
        };
      }),
    );

    return threadsWithUnread;
  }

  async getThreadById(userId: string, threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        studentProfile: {
          select: { id: true, fullName: true },
        },
        guardian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.guardianUserId !== userId && thread.teacherUserId !== userId) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    return thread;
  }

  async createThread(userId: string, dto: CreateThreadDto) {
    // 1. Verify that user is a guardian
    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
    });

    if (!guardianProfile) {
      throw new ForbiddenException(
        'Only guardians can start messaging threads.',
      );
    }

    // 2. Verify that guardian is linked to student and has academic access
    if (dto.studentProfileId) {
      await this.guardianAccessService.assertCanAccessStudent(
        userId,
        dto.studentProfileId,
      );
    }

    // 3. Verify that teacher exists
    const teacherUser = await this.prisma.user.findUnique({
      where: { id: dto.teacherUserId },
      include: { teacherProfile: true },
    });

    if (!teacherUser || !teacherUser.teacherProfile) {
      throw new NotFoundException('Teacher profile not found.');
    }

    // 4. Create the thread and first message in a transaction
    const thread = await this.prisma.$transaction(async (tx) => {
      const newThread = await tx.messageThread.create({
        data: {
          subject: dto.subject,
          studentProfileId: dto.studentProfileId || null,
          guardianUserId: userId,
          teacherUserId: dto.teacherUserId,
        },
      });

      await tx.message.create({
        data: {
          threadId: newThread.id,
          senderUserId: userId,
          body: dto.firstMessageBody,
        },
      });

      return newThread;
    });

    // 5. Send notification to teacher
    await this.notificationsService
      .create({
        userId: dto.teacherUserId,
        type: 'INFO',
        title: `New Message Thread: ${dto.subject}`,
        body: `You have received a new message thread from guardian ${guardianProfile.fullName}.`,
        metadata: { threadId: thread.id },
      })
      .catch((err) => console.error('Failed to create notification', err));

    return this.getThreadById(userId, thread.id);
  }

  async postMessage(userId: string, threadId: string, dto: CreateMessageDto) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.guardianUserId !== userId && thread.teacherUserId !== userId) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    // 1. Create message & update thread
    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          threadId,
          senderUserId: userId,
          body: dto.body,
          attachmentUrls: dto.attachmentUrls || [],
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.messageThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      });

      return msg;
    });

    // 2. Notify recipient
    const recipientUserId =
      thread.guardianUserId === userId
        ? thread.teacherUserId
        : thread.guardianUserId;
    const senderName =
      thread.guardianUserId === userId ? 'Guardian' : 'Teacher';

    await this.notificationsService
      .create({
        userId: recipientUserId,
        type: 'INFO',
        title: `New Message in thread: ${thread.subject}`,
        body: `${senderName} sent you a new message.`,
        metadata: { threadId, messageId: message.id },
      })
      .catch((err) => console.error('Failed to create notification', err));

    return message;
  }

  async markThreadRead(userId: string, threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.guardianUserId !== userId && thread.teacherUserId !== userId) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    await this.prisma.message.updateMany({
      where: {
        threadId,
        senderUserId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        thread: {
          OR: [{ guardianUserId: userId }, { teacherUserId: userId }],
        },
        senderUserId: { not: userId },
        readAt: null,
      },
    });

    return { count };
  }
}
