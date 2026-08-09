import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateModuleItemDto,
  UpdateModuleItemDto,
  UpdateModuleItemProgressDto,
  CreateDiscussionPostDto,
} from './dto/module-item.dto';
import { ProgressionService } from '../progression/progression.service';

@Injectable()
export class ModuleItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
  ) {}

  async createModuleItem(dto: CreateModuleItemDto) {
    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
    });
    if (!concept) {
      throw new NotFoundException('Concept not found');
    }
    if (dto.kind === 'ASSESSMENT') {
      if (!dto.assessmentId) {
        throw new BadRequestException(
          'assessmentId is required for an ASSESSMENT item',
        );
      }
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: dto.assessmentId },
      });
      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.moduleItem.create({
        data: {
          conceptId: dto.conceptId,
          kind: dto.kind,
          title: dto.title,
          sortOrder: dto.sortOrder ?? 1,
          status: dto.status ?? 'DRAFT',
          videoUrl: dto.videoUrl || null,
          videoDurationSeconds: dto.videoDurationSeconds ?? null,
          readingContent: dto.readingContent || null,
          assessmentId: dto.kind === 'ASSESSMENT' ? dto.assessmentId : null,
        },
      });

      if (dto.kind === 'DISCUSSION') {
        await tx.discussionThread.create({
          data: {
            moduleItemId: item.id,
            prompt: dto.discussionPrompt || dto.title,
          },
        });
      }

      return tx.moduleItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { discussion: true },
      });
    });
  }

  async updateModuleItem(id: string, dto: UpdateModuleItemDto) {
    const item = await this.prisma.moduleItem.findUnique({ where: { id } });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }
    return this.prisma.moduleItem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.videoDurationSeconds !== undefined
          ? { videoDurationSeconds: dto.videoDurationSeconds }
          : {}),
        ...(dto.readingContent !== undefined
          ? { readingContent: dto.readingContent }
          : {}),
        ...(dto.assessmentId !== undefined
          ? { assessmentId: dto.assessmentId }
          : {}),
      },
    });
  }

  async deleteModuleItem(id: string) {
    const item = await this.prisma.moduleItem.findUnique({ where: { id } });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }
    return this.prisma.moduleItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsertProgress(
    moduleItemId: string,
    userId: string,
    dto: UpdateModuleItemProgressDto,
  ) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
    });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }

    // The lock is computed for the course-detail response, but until this call
    // existed nothing re-checked it at the point of writing — so a client that
    // skipped ahead (or any direct API call) could mark locked content done.
    await this.progression.assertConceptUnlocked(userId, item.conceptId);

    const studentProfileId = await this.resolveStudentProfileId(userId);
    if (!studentProfileId) {
      throw new BadRequestException(
        'Only students can record module item progress',
      );
    }

    const existing = await this.prisma.moduleItemProgress.findUnique({
      where: {
        moduleItemId_studentProfileId: { moduleItemId, studentProfileId },
      },
    });

    let completedAt = existing?.completedAt ?? null;
    if (dto.completed === true) {
      completedAt = existing?.completedAt ?? new Date();
    } else if (dto.completed === false) {
      completedAt = null;
    }

    return this.prisma.moduleItemProgress.upsert({
      where: {
        moduleItemId_studentProfileId: { moduleItemId, studentProfileId },
      },
      update: {
        completedAt,
        ...(dto.lastPositionSeconds !== undefined
          ? { lastPositionSeconds: dto.lastPositionSeconds }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      create: {
        moduleItemId,
        studentProfileId,
        completedAt,
        lastPositionSeconds: dto.lastPositionSeconds ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  // Resolves the current student's existing AssessmentAssignment for this
  // item's linked Assessment (if any) — the existing assignment-creation
  // workflow (teacher assigns a class section) is unchanged/out of scope
  // here; this just looks up what already exists so the outline can link
  // straight to the existing standalone assessment player.
  async getMyAssignmentForItem(moduleItemId: string, userId: string) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
      select: { assessmentId: true },
    });
    if (!item || !item.assessmentId) {
      throw new NotFoundException(
        'This item is not linked to an assessment',
      );
    }
    const studentProfileId = await this.resolveStudentProfileId(userId);
    if (!studentProfileId) {
      return { assignment: null };
    }
    const assignment = await this.prisma.assessmentAssignment.findFirst({
      where: { assessmentId: item.assessmentId, studentProfileId },
      select: { id: true, status: true, dueAt: true },
    });
    return { assignment: assignment ?? null };
  }

  async getDiscussion(moduleItemId: string) {
    const thread = await this.prisma.discussionThread.findUnique({
      where: { moduleItemId },
      include: {
        posts: {
          orderBy: { createdAt: 'asc' },
          include: {
            studentProfile: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    if (!thread) {
      throw new NotFoundException('Discussion thread not found');
    }
    return thread;
  }

  async addDiscussionPost(
    moduleItemId: string,
    userId: string,
    dto: CreateDiscussionPostDto,
  ) {
    const thread = await this.prisma.discussionThread.findUnique({
      where: { moduleItemId },
    });
    if (!thread) {
      throw new NotFoundException('Discussion thread not found');
    }
    const studentProfileId = await this.resolveStudentProfileId(userId);
    if (!studentProfileId) {
      throw new BadRequestException('Only students can post to a discussion');
    }
    return this.prisma.discussionPost.create({
      data: {
        discussionThreadId: thread.id,
        studentProfileId,
        parentPostId: dto.parentPostId || null,
        body: dto.body,
      },
      include: {
        studentProfile: { select: { id: true, fullName: true } },
      },
    });
  }

  private async resolveStudentProfileId(
    userId: string,
  ): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }
}
