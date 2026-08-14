import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { resolveCampusIdsForStudentIds } from '../institution/campus-resolution.util';

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'];

@Injectable()
export class GuardianAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getLinkedStudentIds(userId: string): Promise<string[]> {
    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        students: {
          where: {
            hasAcademicAccess: true,
          },
        },
      },
    });

    if (!guardianProfile) {
      return [];
    }

    return guardianProfile.students.map((rel) => rel.studentProfileId);
  }

  async assertCanAccessStudent(
    userId: string,
    studentProfileId: string,
  ): Promise<void> {
    const linkedIds = await this.getLinkedStudentIds(userId);
    if (!linkedIds.includes(studentProfileId)) {
      throw new ForbiddenException(
        "You do not have permission to access this student's academic records.",
      );
    }
  }

  /**
   * Broader than `assertCanAccessStudent` above (which is guardian-only) —
   * covers the three legitimate ways a caller can read a given student's
   * personal records (schedule, grades, assignments, attempts): it's their
   * own record, they're a guardian linked to that student, or they hold a
   * staff role that already has broad access elsewhere in the app. Several
   * "student/:id" routes across timetable/gradebook/assessments previously
   * only checked a role-level permission with no ownership check at all —
   * this centralizes the fix so it isn't reimplemented slightly differently
   * in each controller.
   */
  async assertCanAccessStudentRecord(
    user: CurrentUserDto,
    studentProfileId: string,
  ): Promise<void> {
    if (user.roles.some((role) => STAFF_ROLES.includes(role))) {
      return;
    }
    if (user.studentProfile?.id === studentProfileId) {
      return;
    }
    await this.assertCanAccessStudent(user.id, studentProfileId);
  }

  /**
   * Union of the campuses every linked student (with academic access) is
   * actively placed at — used to resolve catalog visibility for a guardian
   * browsing generally, not viewing one specific child (that case already
   * has its own studentProfileId param on the relevant endpoints).
   */
  async getLinkedCampusIds(userId: string): Promise<string[]> {
    const studentProfileIds = await this.getLinkedStudentIds(userId);
    return resolveCampusIdsForStudentIds(this.prisma, studentProfileIds);
  }

  async getGuardianFamilyId(userId: string): Promise<string | null> {
    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        families: true,
      },
    });

    if (!guardianProfile || guardianProfile.families.length === 0) {
      return null;
    }

    return guardianProfile.families[0].familyId;
  }
}
