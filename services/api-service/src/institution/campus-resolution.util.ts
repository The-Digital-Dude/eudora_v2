import { PrismaService } from '../prisma/prisma.service';

/**
 * Campus(es) the given students are actively placed at.
 *
 * Extracted as a plain function rather than a service method because both
 * `CampusAccessService` and `GuardianAccessService` need it, and making either
 * depend on the other would introduce a circular module reference for what is
 * a single query. Neither `StudentProfile` nor `TeacherProfile` carries a
 * `campusId`, so this always traverses the placement chain down to
 * `Program.campusId`.
 */
export async function resolveCampusIdsForStudentIds(
  prisma: PrismaService,
  studentProfileIds: string[],
): Promise<string[]> {
  if (studentProfileIds.length === 0) {
    return [];
  }

  const placements = await prisma.studentClassPlacement.findMany({
    where: { studentProfileId: { in: studentProfileIds }, isActive: true },
    select: {
      classSection: { select: { program: { select: { campusId: true } } } },
    },
  });

  return [...new Set(placements.map((p) => p.classSection.program.campusId))];
}
