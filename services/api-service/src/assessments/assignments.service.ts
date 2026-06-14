import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssignmentDto,
  ListAssignmentsQueryDto,
  UpdateAssignmentDto,
} from './dto/assessments.dto';
import {
  assignmentSelect,
  emptyToNull,
  enumFilter,
  enumValue,
  idFilter,
  normalizePagination,
  parseOptionalDate,
  requireRecord,
  requireText,
  toPage,
  audit,
} from './assessments.common';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssignments(query: ListAssignmentsQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...idFilter('assessmentId', query.assessmentId),
      ...idFilter('studentProfileId', query.studentProfileId),
      ...idFilter('classSectionId', query.classSectionId),
      ...enumFilter('status', query.status, [
        'assigned',
        'started',
        'submitted',
        'overdue',
        'exempted',
        'cancelled',
      ]),
    };
    const [items, total] = await Promise.all([
      this.prisma.assessmentAssignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
        select: assignmentSelect,
      }),
      this.prisma.assessmentAssignment.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async getAssignment(id: string) {
    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: { id },
      select: assignmentSelect,
    });
    return requireRecord(assignment, 'Assignment not found');
  }

  async createAssignment(input: CreateAssignmentDto, actorUserId: string) {
    const studentProfileId = emptyToNull(input.studentProfileId);
    const classSectionId = emptyToNull(input.classSectionId);
    if (!studentProfileId && !classSectionId) {
      throw new BadRequestException(
        'Either studentProfileId or classSectionId must be provided',
      );
    }

    if (studentProfileId) {
      let resolvedClassSectionId = classSectionId;
      if (!resolvedClassSectionId) {
        const placement = await this.prisma.studentClassPlacement.findFirst({
          where: { studentProfileId, isActive: true },
          select: { classSectionId: true },
        });
        if (!placement) {
          throw new BadRequestException(
            'Student does not have an active class section placement',
          );
        }
        resolvedClassSectionId = placement.classSectionId;
      }

      const assignment = await this.prisma.assessmentAssignment.create({
        data: {
          assessmentId: requireText(input.assessmentId, 'assessmentId'),
          studentProfileId,
          classSectionId: resolvedClassSectionId,
          lessonId: emptyToNull(input.lessonId),
          assignedByUserId: actorUserId,
          opensAt: parseOptionalDate(input.opensAt, 'opensAt') ?? new Date(),
          dueAt: parseOptionalDate(input.dueAt, 'dueAt') ?? new Date(),
          status: enumValue(
            input.status ?? 'assigned',
            ['assigned', 'started', 'submitted', 'overdue', 'exempted', 'cancelled'],
            'status',
          ),
        },
        select: assignmentSelect,
      });
      await audit(
        this.prisma,
        actorUserId,
        'assessments.assignment.created',
        'assessmentAssignment',
        assignment.id,
      );
      return assignment;
    } else {
      const placements = await this.prisma.studentClassPlacement.findMany({
        where: { classSectionId: classSectionId!, isActive: true },
        select: { studentProfileId: true },
      });
      if (placements.length === 0) {
        throw new BadRequestException(
          'No active students found in this class section',
        );
      }

      const createdAssignments = await this.prisma.$transaction(async (tx) => {
        const list: any[] = [];
        for (const placement of placements) {
          const assignment = await tx.assessmentAssignment.create({
            data: {
              assessmentId: requireText(input.assessmentId, 'assessmentId'),
              studentProfileId: placement.studentProfileId,
              classSectionId: classSectionId!,
              lessonId: emptyToNull(input.lessonId),
              assignedByUserId: actorUserId,
              opensAt: parseOptionalDate(input.opensAt, 'opensAt') ?? new Date(),
              dueAt: parseOptionalDate(input.dueAt, 'dueAt') ?? new Date(),
              status: enumValue(
                input.status ?? 'assigned',
                ['assigned', 'started', 'submitted', 'overdue', 'exempted', 'cancelled'],
                'status',
              ),
            },
            select: assignmentSelect,
          });
          list.push(assignment);
        }
        return list;
      });

      if (createdAssignments.length > 0) {
        await audit(
          this.prisma,
          actorUserId,
          'assessments.assignment.created',
          'assessmentAssignment',
          createdAssignments[0].id,
        );
        return createdAssignments[0];
      }
      throw new BadRequestException('Failed to create class assignments');
    }
  }

  async updateAssignment(id: string, input: UpdateAssignmentDto, actorUserId: string) {
    const assignment = await this.prisma.assessmentAssignment.update({
      where: { id },
      data: {
        ...(input.opensAt !== undefined ? { opensAt: parseOptionalDate(input.opensAt, 'opensAt') } : {}),
        ...(input.dueAt !== undefined ? { dueAt: parseOptionalDate(input.dueAt, 'dueAt') } : {}),
        ...(input.status !== undefined
          ? {
              status: enumValue(
                input.status,
                ['assigned', 'started', 'submitted', 'overdue', 'exempted', 'cancelled'],
                'status',
              ),
            }
          : {}),
      } as any,
      select: assignmentSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.assignment.updated',
      'assessmentAssignment',
      assignment.id,
    );
    return assignment;
  }

  async cancelAssignment(id: string, actorUserId: string) {
    const assignment = await this.prisma.assessmentAssignment.update({
      where: { id },
      data: { status: 'cancelled' },
      select: assignmentSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.assignment.cancelled',
      'assessmentAssignment',
      assignment.id,
    );
    return assignment;
  }

  async remindAssignment(id: string, actorUserId: string) {
    const assignment = await this.prisma.assessmentAssignment.update({
      where: { id },
      data: { reminderCount: { increment: 1 } },
      select: assignmentSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.assignment.reminded',
      'assessmentAssignment',
      assignment.id,
    );
    return assignment;
  }
}
