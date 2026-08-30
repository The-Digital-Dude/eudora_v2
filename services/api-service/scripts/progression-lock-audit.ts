import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { ProgressionService } from '../src/progression/progression.service';
import type { PrismaService } from '../src/prisma/prisma.service';

/**
 * Counts the students who would start getting 403s if `PROGRESSION_ENFORCEMENT`
 * were flipped to `enforce`.
 *
 * The rule has been computed for display but never enforced, so students have
 * been free to work out of order for as long as the product has existed.
 * Turning it on is therefore not a config change: it can lock real children out
 * of chapters they are already partway through.
 *
 * ProgressionService's own comment says to run in `log` until the warnings go
 * quiet. That needs somebody watching a log for an unknown number of weeks, and
 * it only ever sees students who happen to be active in the window. This reads
 * the same rule off the data and answers the question directly.
 *
 * The rule itself is imported rather than reimplemented. It is subtle — a
 * CHECKPOINT with no responses counts as passed, accuracy is over every
 * response rather than first attempts, and only COMPLETED attempts count — and
 * a copy would answer confidently with a different rule the day either changed.
 * The service takes nothing but Prisma, so it constructs without Nest.
 *
 * Reports only. Exits 1 when anyone would be blocked, so it can gate a deploy.
 *
 *   npx ts-node scripts/progression-lock-audit.ts
 *   npx ts-node scripts/progression-lock-audit.ts --verbose
 */

const VERBOSE = process.argv.includes('--verbose');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Roles that author or supervise content rather than progress through it. */
const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'TEACHER']);

async function main() {
  const progression = new ProgressionService(prisma as unknown as PrismaService);

  const students = await prisma.studentProfile.findMany({
    select: {
      id: true,
      fullName: true,
      user: {
        select: { roles: { select: { role: { select: { name: true } } } } },
      },
    },
  });

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      concepts: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          sortOrder: true,
          kind: true,
          passThresholdPercent: true,
          lessons: { select: { id: true } },
          items: { select: { id: true } },
        },
      },
    },
  });

  const blocked: {
    student: string;
    course: string;
    concept: string;
    reason: string;
  }[] = [];
  let studentsChecked = 0;

  for (const student of students) {
    // The same two exemptions the service applies. Staff are not on a
    // progression track even when they own a StudentProfile, which the seeded
    // admin account does.
    if (student.user.roles.some((r) => STAFF_ROLES.has(r.role.name))) continue;
    studentsChecked++;

    for (const course of courses) {
      if (course.concepts.length === 0) continue;

      const state = await progression.computeConceptUnlockState(
        student.id,
        course.concepts,
      );

      for (const entry of state) {
        if (!entry.isLocked) continue;

        const concept = course.concepts.find((c) => c.id === entry.conceptId);
        if (!concept) continue;

        // Locked — so the question is whether they have touched it anyway.
        const itemIds = concept.items.map((m) => m.id);
        const lessonIds = concept.lessons.map((l) => l.id);

        const [progressRows, attemptRows] = await Promise.all([
          itemIds.length
            ? prisma.moduleItemProgress.count({
                where: {
                  studentProfileId: student.id,
                  moduleItemId: { in: itemIds },
                },
              })
            : 0,
          lessonIds.length
            ? prisma.lessonAttempt.count({
                where: {
                  studentProfileId: student.id,
                  lessonId: { in: lessonIds },
                },
              })
            : 0,
        ]);

        if (progressRows + attemptRows > 0) {
          blocked.push({
            student: student.fullName,
            course: course.title,
            concept: concept.id,
            reason: `${progressRows} item-progress, ${attemptRows} lesson attempts`,
          });
        }
      }
    }
  }

  const affected = new Set(blocked.map((b) => b.student));
  console.log(`students checked (staff excluded): ${studentsChecked}`);
  console.log(`courses checked:                   ${courses.length}`);
  console.log(`students holding locked progress:  ${affected.size}`);
  console.log(`locked concepts touched:           ${blocked.length}`);

  if (blocked.length && VERBOSE) {
    console.log('');
    for (const b of blocked) {
      console.log(
        `  ${b.student} — ${b.course} — concept ${b.concept} (${b.reason})`,
      );
    }
  }

  if (blocked.length === 0) {
    console.log('\nNobody would be locked out of work they have already');
    console.log('started. Safe to set PROGRESSION_ENFORCEMENT=enforce.');
    return;
  }

  console.log(
    '\nTurning enforcement on now would 403 these students inside chapters',
  );
  console.log('they are already partway through. Re-run with --verbose to see');
  console.log('who, and decide per student before flipping the flag.');
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
