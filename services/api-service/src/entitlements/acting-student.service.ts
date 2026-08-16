import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Header a guardian's client sends to act on a specific child's behalf. */
export const ACTING_STUDENT_HEADER = 'x-acting-student-id';

/**
 * Resolves which student a request is really about.
 *
 * A guardian is not a student — they own no `StudentProfile` — so without this
 * a parent browsing on the family tablet would be denied their own child's
 * purchased content. The guardian picks a child in the UI and the client sends
 * that id; this turns it into a verified student context.
 *
 * This is impersonation, so the guardian-child link is re-checked from the
 * database on every request. A client-supplied id is never trusted on its own,
 * and staff do NOT get to impersonate through this path — they have their own
 * role-based bypass and should not silently inherit a child's identity.
 */
@Injectable()
export class ActingStudentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the student profile id this request should be evaluated against.
   *
   * Order matters: a caller who *is* a student always resolves to themselves,
   * so a student cannot pass a header to read a sibling's content.
   */
  async resolve(
    userId: string | undefined,
    actingStudentId: string | null | undefined,
  ): Promise<string | null> {
    if (!userId) return null;

    const own = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (own) return own.id;

    if (!actingStudentId) return null;

    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!guardian) {
      throw new ForbiddenException('Not permitted to act for this student');
    }

    const link = await this.prisma.guardianStudentRelationship.findUnique({
      where: {
        guardianProfileId_studentProfileId: {
          guardianProfileId: guardian.id,
          studentProfileId: actingStudentId,
        },
      },
      select: { hasAcademicAccess: true },
    });
    if (!link || !link.hasAcademicAccess) {
      throw new ForbiddenException('Not permitted to act for this student');
    }

    return actingStudentId;
  }

  /** Pulls the header off a request, normalising the empty case to null. */
  static fromHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): string | null {
    const raw = headers[ACTING_STUDENT_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value && value.trim() ? value.trim() : null;
  }
}
