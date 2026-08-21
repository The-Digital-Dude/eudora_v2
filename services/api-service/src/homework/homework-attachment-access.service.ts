import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Who may read a file a learner handed in.
 *
 * A CV had exactly one audience — the operator reviewing it — so its download
 * route was a plain admin check. Student work has four, and getting the list
 * wrong in either direction is a real failure: too narrow and a teacher cannot
 * mark the thing they were sent, too wide and a stranger reads a child's
 * homework with their name on it.
 *
 *   1. the learner whose work it is
 *   2. a guardian linked to them, and only with academic access — the same flag
 *      that governs every other view of that child's record
 *   3. a teacher of the cohort or course the homework belongs to, not any
 *      teacher on the platform
 *   4. ADMIN / SUPER_ADMIN
 *
 * Deliberately its own service rather than a branch inside the controller:
 * this is the rule that decides whether a child's work leaks, and it should be
 * readable in one piece and testable on its own.
 */
@Injectable()
export class HomeworkAttachmentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanRead(
    fileUploadId: string,
    user: { id: string; roles?: string[] },
  ): Promise<void> {
    const attachment =
      await this.prisma.homeworkSubmissionAttachment.findUnique({
        where: { fileUploadId },
        select: {
          submission: {
            select: {
              studentProfileId: true,
              homework: {
                select: { batchId: true, moduleItemId: true },
              },
            },
          },
        },
      });
    if (!attachment) {
      throw new NotFoundException('File not found');
    }

    const roles = user.roles ?? [];
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
      return;
    }

    const { studentProfileId, homework } = attachment.submission;

    // 1. The learner themselves.
    const own = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (own?.id === studentProfileId) {
      return;
    }

    // 2. A guardian with academic access to this child.
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (guardian) {
      const link = await this.prisma.guardianStudentRelationship.findUnique({
        where: {
          guardianProfileId_studentProfileId: {
            guardianProfileId: guardian.id,
            studentProfileId,
          },
        },
        select: { hasAcademicAccess: true },
      });
      if (link?.hasAcademicAccess) {
        return;
      }
    }

    // 3. A teacher of the thing this homework belongs to.
    if (roles.includes('TEACHER') && (await this.teaches(user.id, homework))) {
      return;
    }

    throw new ForbiddenException('You cannot open this file');
  }

  /**
   * Whether this teacher is attached to the work in question — leading a
   * cohort, teaching its course, or teaching the course a checkpoint sits in.
   * Being a teacher somewhere on the platform is not enough.
   */
  private async teaches(
    userId: string,
    homework: { batchId: string | null; moduleItemId: string | null },
  ): Promise<boolean> {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!teacher) return false;

    if (homework.batchId) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: homework.batchId },
        select: { leadTeacherProfileId: true, courseId: true },
      });
      if (!batch) return false;
      if (batch.leadTeacherProfileId === teacher.id) return true;
      if (!batch.courseId) return false;
      return this.teachesCourse(teacher.id, batch.courseId);
    }

    if (homework.moduleItemId) {
      const item = await this.prisma.moduleItem.findUnique({
        where: { id: homework.moduleItemId },
        select: { concept: { select: { courseId: true } } },
      });
      const courseId = item?.concept.courseId;
      if (!courseId) return false;
      return this.teachesCourse(teacher.id, courseId);
    }

    return false;
  }

  private async teachesCourse(
    teacherProfileId: string,
    courseId: string,
  ): Promise<boolean> {
    const assignment = await this.prisma.courseTeacher.findFirst({
      where: { teacherProfileId, courseId },
      select: { courseId: true },
    });
    return !!assignment;
  }
}
