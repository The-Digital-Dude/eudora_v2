import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LiveClassStatus } from '@prisma/client';
import {
  CreateLiveClassDto,
  ListLiveClassesQueryDto,
  RescheduleLiveClassDto,
} from './dto/live-class.dto';

const INCLUDE = {
  classSection: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class LiveClassesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertValidWindow(start: Date, end: Date) {
    if (end <= start) {
      throw new BadRequestException(
        'scheduledEndAt must be after scheduledStartAt',
      );
    }
  }

  async scheduleLiveClass(dto: CreateLiveClassDto, teacherUserId: string) {
    const classSection = await this.prisma.classSection.findUnique({
      where: { id: dto.classSectionId },
    });
    if (!classSection) {
      throw new NotFoundException('Class section not found');
    }

    const scheduledStartAt = new Date(dto.scheduledStartAt);
    const scheduledEndAt = new Date(dto.scheduledEndAt);
    this.assertValidWindow(scheduledStartAt, scheduledEndAt);

    // Zoom hook (WS-E follow-on): call the Zoom Server-to-Server OAuth API
    // here to create the meeting and populate provider/externalMeetingId/
    // joinUrl/startUrl. Not implemented yet — provider stays NONE.
    return this.prisma.liveClassSession.create({
      data: {
        classSectionId: dto.classSectionId,
        teacherUserId,
        title: dto.title,
        scheduledStartAt,
        scheduledEndAt,
      },
      include: INCLUDE,
    });
  }

  async listLiveClasses(query: ListLiveClassesQueryDto) {
    return this.prisma.liveClassSession.findMany({
      where: {
        ...(query.classSectionId
          ? { classSectionId: query.classSectionId }
          : {}),
        ...(query.teacherUserId ? { teacherUserId: query.teacherUserId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.from || query.to
          ? {
              scheduledStartAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      include: INCLUDE,
      orderBy: { scheduledStartAt: 'asc' },
    });
  }

  async getLiveClassById(id: string) {
    const session = await this.prisma.liveClassSession.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!session) {
      throw new NotFoundException('Live class session not found');
    }
    return session;
  }

  async rescheduleLiveClass(id: string, dto: RescheduleLiveClassDto) {
    const session = await this.getLiveClassById(id);
    if (
      session.status === LiveClassStatus.CANCELLED ||
      session.status === LiveClassStatus.ENDED
    ) {
      throw new BadRequestException(
        `Cannot reschedule a session that is already ${session.status}`,
      );
    }

    const scheduledStartAt = dto.scheduledStartAt
      ? new Date(dto.scheduledStartAt)
      : session.scheduledStartAt;
    const scheduledEndAt = dto.scheduledEndAt
      ? new Date(dto.scheduledEndAt)
      : session.scheduledEndAt;
    this.assertValidWindow(scheduledStartAt, scheduledEndAt);

    return this.prisma.liveClassSession.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        scheduledStartAt,
        scheduledEndAt,
      },
      include: INCLUDE,
    });
  }

  async cancelLiveClass(id: string) {
    const session = await this.getLiveClassById(id);
    if (
      session.status === LiveClassStatus.CANCELLED ||
      session.status === LiveClassStatus.ENDED
    ) {
      throw new BadRequestException(
        `Cannot cancel a session that is already ${session.status}`,
      );
    }
    return this.prisma.liveClassSession.update({
      where: { id },
      data: { status: LiveClassStatus.CANCELLED, cancelledAt: new Date() },
      include: INCLUDE,
    });
  }

  async startLiveClass(id: string) {
    const session = await this.getLiveClassById(id);
    if (session.status !== LiveClassStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot start a session with status ${session.status}`,
      );
    }
    // Zoom hook (WS-E follow-on): call POST /users/{userId}/meetings here
    // and populate provider/externalMeetingId/joinUrl/startUrl before
    // flipping status to LIVE. Not implemented yet.
    return this.prisma.liveClassSession.update({
      where: { id },
      data: { status: LiveClassStatus.LIVE },
      include: INCLUDE,
    });
  }

  async endLiveClass(id: string) {
    const session = await this.getLiveClassById(id);
    if (session.status !== LiveClassStatus.LIVE) {
      throw new BadRequestException(
        `Cannot end a session with status ${session.status}`,
      );
    }
    return this.prisma.liveClassSession.update({
      where: { id },
      data: { status: LiveClassStatus.ENDED },
      include: INCLUDE,
    });
  }
}
