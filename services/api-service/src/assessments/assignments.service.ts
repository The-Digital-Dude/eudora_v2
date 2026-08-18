import { BadRequestException, Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  async listAssignments(query: ListAssignmentsQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...idFilter('assessmentId', query.assessmentId),
      ...idFilter('studentProfileId', query.studentProfileId),
      // An assignment has no batch of its own — it belongs to a student. A
      // batch filter therefore means "assignments held by anyone enrolled in
      // this batch".
      ...(query.batchId
        ? {
            studentProfile: {
              enrollments: { some: { batchId: query.batchId } },
            },
          }
        : {}),
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

  async getAssignment(id: string, user: CurrentUserDto) {
    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: { id },
      select: assignmentSelect,
    });
    const resolved = requireRecord(assignment, 'Assignment not found');
    // Class-wide assignments (no studentProfileId) aren't tied to an
    // individual student, so there's no per-student ownership to check —
    // matches the class-section schedule exemption in TimetableController.
    if (resolved.studentProfileId) {
      await this.guardianAccessService.assertCanAccessStudentRecord(
        user,
        resolved.studentProfileId,
      );
    }
    return resolved;
  }

  async createAssignment(input: CreateAssignmentDto, actorUserId: string) {
    const studentProfileId = emptyToNull(input.studentProfileId);
    const batchId = emptyToNull(input.batchId);
    if (!studentProfileId && !batchId) {
      throw new BadRequestException(
        'Either studentProfileId or batchId must be provided',
      );
    }

    if (studentProfileId) {
      // No cohort membership is required to assign to one student. This used
      // to demand an active ClassSection placement, which meant a child
      // created through guardian checkout — who has a `classId` but no
      // placement — could never be assigned anything.
      const assignment = await this.prisma.assessmentAssignment.create({
        data: {
          assessmentId: requireText(input.assessmentId, 'assessmentId'),
          studentProfileId,
          lessonId: emptyToNull(input.lessonId),
          assignedByUserId: actorUserId,
          opensAt: parseOptionalDate(input.opensAt, 'opensAt') ?? new Date(),
          dueAt: parseOptionalDate(input.dueAt, 'dueAt') ?? new Date(),
          status: enumValue(
            input.status ?? 'assigned',
            [
              'assigned',
              'started',
              'submitted',
              'overdue',
              'exempted',
              'cancelled',
            ],
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
      const enrollments = await this.prisma.studentCourseEnrollment.findMany({
        where: { batchId: batchId!, status: EnrollmentStatus.ENROLLED },
        select: { studentProfileId: true },
      });
      if (enrollments.length === 0) {
        throw new BadRequestException(
          'No actively enrolled students found in this batch',
        );
      }

      const createdAssignments = await this.prisma.$transaction(async (tx) => {
        const list: any[] = [];
        for (const enrollment of enrollments) {
          const assignment = await tx.assessmentAssignment.create({
            data: {
              assessmentId: requireText(input.assessmentId, 'assessmentId'),
              studentProfileId: enrollment.studentProfileId,
              lessonId: emptyToNull(input.lessonId),
              assignedByUserId: actorUserId,
              opensAt:
                parseOptionalDate(input.opensAt, 'opensAt') ?? new Date(),
              dueAt: parseOptionalDate(input.dueAt, 'dueAt') ?? new Date(),
              status: enumValue(
                input.status ?? 'assigned',
                [
                  'assigned',
                  'started',
                  'submitted',
                  'overdue',
                  'exempted',
                  'cancelled',
                ],
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
      throw new BadRequestException('Failed to create batch assignments');
    }
  }

  async updateAssignment(
    id: string,
    input: UpdateAssignmentDto,
    actorUserId: string,
  ) {
    const assignment = await this.prisma.assessmentAssignment.update({
      where: { id },
      data: {
        ...(input.opensAt !== undefined
          ? { opensAt: parseOptionalDate(input.opensAt, 'opensAt') }
          : {}),
        ...(input.dueAt !== undefined
          ? { dueAt: parseOptionalDate(input.dueAt, 'dueAt') }
          : {}),
        ...(input.status !== undefined
          ? {
              status: enumValue(
                input.status,
                [
                  'assigned',
                  'started',
                  'submitted',
                  'overdue',
                  'exempted',
                  'cancelled',
                ],
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
