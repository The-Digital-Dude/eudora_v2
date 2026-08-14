import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { resolveCampusIdsForStudentIds } from './campus-resolution.util';

// Only these roles bypass campus scoping entirely.
// TEACHER is deliberately excluded — a teacher sees what their own campus's
// students see, not the whole platform.
const CAMPUS_BYPASS_ROLES = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Campus scoping and access assertions.
 *
 * Split out of `InstitutionService` so that consumers which only need campus
 * checks — `AcademicModule`, for one — don't transitively pull in the billing
 * subtree that `InstitutionModule` imports. `InstitutionService` keeps thin
 * delegating wrappers so its existing callers are unaffected.
 */
@Injectable()
export class CampusAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  /**
   * Resolves which campus(es) a user is actively associated with. Returns
   * `null` for SUPER_ADMIN/ADMIN — bypass, they see every campus. Returns `[]`
   * when the user has no resolvable active campus; callers must treat that as
   * "only globally-unassigned content visible," never as "show everything."
   */
  async resolveCampusIdsForUser(
    user: CurrentUserDto,
  ): Promise<string[] | null> {
    if (user.roles.some((role) => CAMPUS_BYPASS_ROLES.includes(role))) {
      return null;
    }

    if (user.roles.includes('TEACHER')) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!teacherProfile) return [];
      const assignments = await this.prisma.classTeacher.findMany({
        where: { teacherProfileId: teacherProfile.id },
        select: {
          classSection: { select: { program: { select: { campusId: true } } } },
        },
      });
      return [
        ...new Set(assignments.map((a) => a.classSection.program.campusId)),
      ];
    }

    if (user.studentProfile) {
      return this.resolveCampusIdsForStudent(user.studentProfile.id);
    }

    if (user.roles.includes('GUARDIAN')) {
      return this.guardianAccessService.getLinkedCampusIds(user.id);
    }

    return [];
  }

  /**
   * Campus(es) one specific student is actively placed at. Distinct from
   * `GuardianAccessService.getLinkedCampusIds`, which unions *every* linked
   * child's campuses — too broad when the caller has named one child.
   */
  async resolveCampusIdsForStudent(
    studentProfileId: string,
  ): Promise<string[]> {
    return resolveCampusIdsForStudentIds(this.prisma, [studentProfileId]);
  }

  /**
   * Throws unless the user may act within `campusId`. Mirrors the ownership
   * precedent set by `GuardianAccessService.assertCanAccessStudentRecord`:
   * a role check alone is not enough on routes that expose another branch's
   * student data.
   */
  async assertCanAccessCampus(
    user: CurrentUserDto,
    campusId: string,
  ): Promise<void> {
    const campusIds = await this.resolveCampusIdsForUser(user);
    if (campusIds === null) {
      return;
    }
    if (!campusIds.includes(campusId)) {
      throw new ForbiddenException(
        'You do not have access to this campus’s records',
      );
    }
  }
}
