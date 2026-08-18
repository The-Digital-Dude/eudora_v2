import { Injectable, NotFoundException } from '@nestjs/common';
import { EntitlementSource, EntitlementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActingStudentService } from './acting-student.service';

/**
 * Roles that bypass entitlement checks entirely. Staff author and moderate
 * content, so gating them on purchases would make the product unusable.
 *
 * Note that roles and student profiles are not mutually exclusive — the seeded
 * admin account owns a StudentProfile — so the role check must come first.
 */
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'];

export type AccessDenialReason =
  | 'NO_STUDENT_PROFILE'
  | 'NOT_ENTITLED'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'PAST_DUE'
  | 'REVOKED';

export interface AccessResult {
  allowed: boolean;
  /** True when access comes from a staff role rather than an entitlement. */
  isStaff: boolean;
  reason?: AccessDenialReason;
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actingStudent: ActingStudentService,
  ) {}

  private isStaff(roles: string[] | undefined): boolean {
    return !!roles?.some((r) => STAFF_ROLES.includes(r));
  }

  /**
   * The single authority on whether a user may consume a course's content.
   *
   * Access can come from a direct Course entitlement or from any Program
   * entitlement whose `ProgramCourse` rows include this course — buying the
   * "Class 9 Science" program unlocks every course inside it without writing
   * one entitlement row per course.
   */
  async resolveCourseAccess(
    userId: string | undefined,
    roles: string[] | undefined,
    courseId: string,
    /**
     * Set when a guardian is acting for one of their children on a shared
     * device. Verified against the guardian-child link before it is honoured.
     */
    actingStudentId?: string | null,
  ): Promise<AccessResult> {
    if (this.isStaff(roles)) {
      return { allowed: true, isStaff: true };
    }
    if (!userId) {
      return { allowed: false, isStaff: false, reason: 'NO_STUDENT_PROFILE' };
    }

    // There is no STUDENT role in this system — a student is a USER account
    // that owns a StudentProfile — so entitlements key off the profile. A
    // guardian owns none, which is why the acting-child context exists.
    const studentProfileId = await this.actingStudent.resolve(
      userId,
      actingStudentId,
    );
    if (!studentProfileId) {
      return { allowed: false, isStaff: false, reason: 'NO_STUDENT_PROFILE' };
    }

    const candidates = await this.prisma.entitlement.findMany({
      where: {
        studentProfileId,
        OR: [
          { courseId },
          { program: { programCourses: { some: { courseId } } } },
        ],
      },
      select: {
        status: true,
        accessStartsAt: true,
        accessExpiresAt: true,
        paidThroughDate: true,
      },
    });

    if (candidates.length === 0) {
      return { allowed: false, isStaff: false, reason: 'NOT_ENTITLED' };
    }

    const now = new Date();
    let bestReason: AccessDenialReason = 'NOT_ENTITLED';

    for (const e of candidates) {
      if (e.status === EntitlementStatus.REVOKED) {
        bestReason = 'REVOKED';
        continue;
      }
      if (e.status === EntitlementStatus.PAST_DUE) {
        bestReason = 'PAST_DUE';
        continue;
      }
      if (e.status === EntitlementStatus.EXPIRED) {
        bestReason = 'EXPIRED';
        continue;
      }
      if (e.accessStartsAt > now) {
        bestReason = 'NOT_STARTED';
        continue;
      }
      // Null expiry means permanent — a fully-paid self-paced purchase.
      if (e.accessExpiresAt && e.accessExpiresAt <= now) {
        bestReason = 'EXPIRED';
        continue;
      }
      // While an installment plan is running, access only extends as far as
      // the payments actually collected.
      if (e.paidThroughDate && e.paidThroughDate < now) {
        bestReason = 'PAST_DUE';
        continue;
      }
      return { allowed: true, isStaff: false };
    }

    return { allowed: false, isStaff: false, reason: bestReason };
  }

  async canAccessCourse(
    userId: string | undefined,
    roles: string[] | undefined,
    courseId: string,
    actingStudentId?: string | null,
  ): Promise<boolean> {
    return (
      await this.resolveCourseAccess(userId, roles, courseId, actingStudentId)
    ).allowed;
  }

  /**
   * Resolves access for the course a concept belongs to. Concepts can be
   * orphaned (`Concept.courseId` is nullable), and an orphan belongs to no
   * purchasable thing — treat it as ungated rather than unreachable.
   */
  async canAccessConcept(
    userId: string | undefined,
    roles: string[] | undefined,
    conceptId: string,
    actingStudentId?: string | null,
  ): Promise<boolean> {
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
      select: { courseId: true },
    });
    if (!concept?.courseId) {
      return true;
    }
    return this.canAccessCourse(
      userId,
      roles,
      concept.courseId,
      actingStudentId,
    );
  }

  async canAccessModuleItem(
    userId: string | undefined,
    roles: string[] | undefined,
    moduleItemId: string,
    actingStudentId?: string | null,
  ): Promise<boolean> {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
      select: { isFreePreview: true, concept: { select: { courseId: true } } },
    });
    if (!item) {
      throw new NotFoundException('Module item not found');
    }
    if (item.isFreePreview) {
      return true;
    }
    if (!item.concept.courseId) {
      return true;
    }
    return this.canAccessCourse(
      userId,
      roles,
      item.concept.courseId,
      actingStudentId,
    );
  }

  async canAccessLesson(
    userId: string | undefined,
    roles: string[] | undefined,
    lessonId: string,
    actingStudentId?: string | null,
  ): Promise<boolean> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { concept: { select: { courseId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    if (!lesson.concept.courseId) {
      return true;
    }
    return this.canAccessCourse(
      userId,
      roles,
      lesson.concept.courseId,
      actingStudentId,
    );
  }

  /** Course ids the student may consume, for annotating list responses. */
  async entitledCourseIds(
    userId: string | undefined,
    roles: string[] | undefined,
    actingStudentId?: string | null,
  ): Promise<{ isStaff: boolean; courseIds: Set<string> }> {
    if (this.isStaff(roles)) {
      return { isStaff: true, courseIds: new Set() };
    }
    if (!userId) {
      return { isStaff: false, courseIds: new Set() };
    }

    const studentProfileId = await this.actingStudent.resolve(
      userId,
      actingStudentId,
    );
    if (!studentProfileId) {
      return { isStaff: false, courseIds: new Set() };
    }

    const now = new Date();
    const rows = await this.prisma.entitlement.findMany({
      where: {
        studentProfileId,
        status: EntitlementStatus.ACTIVE,
        accessStartsAt: { lte: now },
        OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
      },
      select: {
        courseId: true,
        paidThroughDate: true,
        program: { select: { programCourses: { select: { courseId: true } } } },
      },
    });

    const courseIds = new Set<string>();
    for (const row of rows) {
      if (row.paidThroughDate && row.paidThroughDate < now) continue;
      if (row.courseId) courseIds.add(row.courseId);
      for (const pc of row.program?.programCourses ?? []) {
        courseIds.add(pc.courseId);
      }
    }
    return { isStaff: false, courseIds };
  }

  // --- Admin grant / revoke -------------------------------------------------
  // Until Stripe lands in Phase 2 this is the only way an entitlement comes
  // into existence, and it stays afterwards as the support tool for refunds,
  // comps and payment disputes.

  /**
   * Admin-wide entitlement search. This is the support tool: refunds, comps
   * and "I paid but cannot see it" tickets all start here, and it is the only
   * way to inspect access that did not come from an order.
   */
  async search(params: {
    query?: string;
    status?: EntitlementStatus;
    limit?: number;
  }) {
    const { query, status, limit = 50 } = params;

    return this.prisma.entitlement.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(query
          ? {
              OR: [
                {
                  studentProfile: {
                    fullName: { contains: query, mode: 'insensitive' },
                  },
                },
                { program: { name: { contains: query, mode: 'insensitive' } } },
                { course: { title: { contains: query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      select: {
        id: true,
        status: true,
        source: true,
        accessStartsAt: true,
        accessExpiresAt: true,
        paidThroughDate: true,
        note: true,
        createdAt: true,
        studentProfile: { select: { id: true, fullName: true } },
        program: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  async listForStudent(studentProfileId: string) {
    return this.prisma.entitlement.findMany({
      where: { studentProfileId },
      orderBy: { createdAt: 'desc' },
      include: {
        program: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async grant(input: {
    studentProfileId: string;
    programId?: string;
    courseId?: string;
    accessExpiresAt?: Date | null;
    note?: string;
    grantedByUserId: string;
  }) {
    const { studentProfileId, programId, courseId } = input;

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (programId) {
      const program = await this.prisma.program.findFirst({
        where: { id: programId },
        select: { id: true },
      });
      if (!program) throw new NotFoundException('Program not found');
    }
    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: courseId, deletedAt: null },
        select: { id: true },
      });
      if (!course) throw new NotFoundException('Course not found');
    }

    // Re-granting a previously revoked or expired entitlement reactivates the
    // existing row rather than colliding with its unique constraint.
    const existing = await this.prisma.entitlement.findFirst({
      where: {
        studentProfileId,
        programId: programId ?? null,
        courseId: courseId ?? null,
      },
      select: { id: true },
    });

    const data = {
      source: EntitlementSource.ADMIN_GRANT,
      status: EntitlementStatus.ACTIVE,
      accessStartsAt: new Date(),
      accessExpiresAt: input.accessExpiresAt ?? null,
      paidThroughDate: null,
      grantedByUserId: input.grantedByUserId,
      note: input.note ?? null,
    };

    if (existing) {
      return this.prisma.entitlement.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.entitlement.create({
      data: {
        studentProfileId,
        programId: programId ?? null,
        courseId: courseId ?? null,
        ...data,
      },
    });
  }

  /** Revocation is a status transition, never a delete — the history has to
   * survive for refund disputes and support. */
  async revoke(id: string, note?: string) {
    const existing = await this.prisma.entitlement.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Entitlement not found');
    }
    return this.prisma.entitlement.update({
      where: { id },
      data: { status: EntitlementStatus.REVOKED, note: note ?? undefined },
    });
  }
}
