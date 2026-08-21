import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BatchSessionsService } from '../batch-sessions/batch-sessions.service';
import { LiveClassStatus, ModuleItemKind } from '@prisma/client';
import {
  CreateLiveClassDto,
  ListLiveClassesQueryDto,
  RescheduleLiveClassDto,
} from './dto/live-class.dto';

const INCLUDE = {
  batch: { select: { id: true, name: true, code: true } },
  moduleItem: { select: { id: true, title: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
};

/**
 * Live classes are `BatchSession` rows.
 *
 * They used to be their own `LiveClassSession` model hanging off ClassSection,
 * which could not express "same course, different cohort, different meeting
 * time" — the shape a live course actually sells in. The curriculum slot now
 * lives on `ModuleItem(kind: LIVE_CLASS)` and the meeting lives here.
 *
 * Callers send `startTime` / `endTime` as instants; `date` is derived from the
 * start, since BatchSession keys its schedule off a DATE column.
 */
@Injectable()
export class LiveClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchSessions: BatchSessionsService,
  ) {}

  private assertValidWindow(start: Date, end: Date) {
    if (end <= start) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  /** BatchSession.date is a DATE column — the day the meeting falls on. */
  private dayOf(instant: Date): Date {
    return new Date(
      Date.UTC(
        instant.getUTCFullYear(),
        instant.getUTCMonth(),
        instant.getUTCDate(),
      ),
    );
  }

  async scheduleLiveClass(dto: CreateLiveClassDto, teacherUserId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      select: { id: true, courseId: true },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    let topic = dto.topic ?? null;

    if (dto.moduleItemId) {
      const item = await this.prisma.moduleItem.findUnique({
        where: { id: dto.moduleItemId },
        select: {
          id: true,
          kind: true,
          title: true,
          deletedAt: true,
          concept: { select: { courseId: true } },
        },
      });
      if (!item || item.deletedAt) {
        throw new NotFoundException('Module item not found');
      }
      if (item.kind !== ModuleItemKind.LIVE_CLASS) {
        throw new BadRequestException(
          'Only a LIVE_CLASS module item can be scheduled as a live class',
        );
      }
      // Scheduling a batch against an item from a different course would put a
      // meeting in an outline the cohort never bought.
      if (
        item.concept.courseId &&
        batch.courseId &&
        item.concept.courseId !== batch.courseId
      ) {
        throw new BadRequestException(
          'This module item belongs to a different course than the batch',
        );
      }
      topic = topic ?? item.title;
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.assertValidWindow(startTime, endTime);

    // Zoom hook (WS-E follow-on): call the Zoom Server-to-Server OAuth API
    // here to create the meeting and populate provider/externalMeetingId/
    // joinUrl/startUrl. Not implemented yet — provider stays NONE.
    // Creation goes through BatchSessionsService so this row is validated the
    // same way an attendance-created one is; re-read with INCLUDE afterwards
    // because the shared create returns the bare row.
    const created = await this.batchSessions.createSession({
      batchId: dto.batchId,
      moduleItemId: dto.moduleItemId ?? null,
      teacherUserId,
      topic,
      date: startTime,
      startTime,
      endTime,
    });

    return this.prisma.batchSession.findUniqueOrThrow({
      where: { id: created.id },
      include: INCLUDE,
    });
  }

  async listLiveClasses(query: ListLiveClassesQueryDto) {
    return this.prisma.batchSession.findMany({
      where: {
        ...(query.batchId ? { batchId: query.batchId } : {}),
        ...(query.moduleItemId ? { moduleItemId: query.moduleItemId } : {}),
        ...(query.teacherUserId ? { teacherUserId: query.teacherUserId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from
                  ? { gte: this.dayOf(new Date(query.from)) }
                  : {}),
                ...(query.to ? { lte: this.dayOf(new Date(query.to)) } : {}),
              },
            }
          : {}),
      },
      include: INCLUDE,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getLiveClassById(id: string) {
    const session = await this.prisma.batchSession.findUnique({
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

    const startTime = dto.startTime
      ? new Date(dto.startTime)
      : session.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : session.endTime;
    if (startTime && endTime) {
      this.assertValidWindow(startTime, endTime);
    }

    return this.prisma.batchSession.update({
      where: { id },
      data: {
        ...(dto.topic ? { topic: dto.topic } : {}),
        ...(startTime ? { startTime, date: this.dayOf(startTime) } : {}),
        ...(endTime ? { endTime } : {}),
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
    return this.prisma.batchSession.update({
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
    return this.prisma.batchSession.update({
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
    return this.prisma.batchSession.update({
      where: { id },
      data: { status: LiveClassStatus.ENDED },
      include: INCLUDE,
    });
  }
}
