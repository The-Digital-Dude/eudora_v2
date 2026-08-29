import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Removes rows left behind by e2e test runs against a shared database.
 *
 * The e2e specs under `test/*.e2e-spec.ts` write real rows and clean most of
 * them up in `afterAll`, keyed to in-memory ids from that run. That cleanup
 * is per-spec, partial, and swallows its own failures (`.catch(() => {})`),
 * so a crashed run, a killed process, or a spec whose `afterAll` never
 * reaches a later id leaves rows behind permanently. There is no single
 * naming convention: `academic-setup`/`assessment-flow`/etc. prefix
 * everything `E2E `/`E2E-...-<tag>`; `education-os` instead uses fixed
 * literal names suffixed with its own `EOS<timestamp>` tag (`Academic Year
 * EOS...`, `Fall Term EOS...`, `Software Engineering EOS...`, batch code
 * `DSA-EOS...`); and several specs mint throwaway accounts under
 * `guardian-`, `regular-user-`, `student-`, `test-user-`, and `e2e-`
 * (`test/helpers/fixtures.ts`) email prefixes, all `@example.com`. Run the
 * suite enough times against one database and it accumulates: this repo's
 * dev database had 17 leftover Classes/Subjects/AssessmentTypes/Assessments,
 * ~15 more AcademicYears/Terms/Programs/Batches under the `EOS` tag, 124
 * `E2E`-coded Batches, 82 `E2E`-named Programs, and 106 orphaned users before
 * this script was written — 83 of them via the four non-`e2e-` prefixes.
 *
 * Every pattern here was confirmed against the actual database before being
 * added, not inferred from the test source alone: a string a spec builds but
 * only sends to an endpoint that `.expect(403)`s never gets persisted, so
 * matching on "any literal template found by grepping the specs" would flag
 * data that was never created. Query the real database, add only what is
 * actually sitting in it.
 *
 * Anything that doesn't match one of these patterns is left alone. A "W6
 * Locked Course" / "W6 Owned Course" pair exists in this database's Course
 * table with no matching string anywhere in `test/` or `src/` — created via a
 * direct API call, not by any spec — so this script does not touch it.
 *
 * Deletion order below was verified against `prisma/schema.prisma`'s actual
 * `onDelete` behaviour, not assumed — most FKs here cascade, but a few
 * (`DailyAttendance.studentProfile`, `Assessment.class/subject/
 * assessmentType`, `PlacementRecommendation.recommendedClass`) default to
 * Restrict and will abort the whole transaction with a foreign-key error if
 * a real, non-test row still depends on the target. That abort is the safety
 * net: it means this script can never partially delete real data it doesn't
 * fully understand the shape of.
 *
 * Usage: `npm run db:clean-e2e-data` (dry run) or
 *        `npm run db:clean-e2e-data -- --apply` (actually deletes).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });
const prisma = new PrismaClient({ adapter });

const E2E = { startsWith: 'E2E' } as const;
const EOS = { contains: 'EOS' } as const;
// `e2e-` (including `e2e-native-`) plus the four fixed-prefix throwaway
// accounts several specs mint directly rather than via the shared fixture.
const TEST_EMAIL_PREFIXES = ['e2e-', 'guardian-', 'regular-user-', 'student-', 'test-user-'];
const emailFilter = { OR: TEST_EMAIL_PREFIXES.map((p) => ({ email: { startsWith: p } })) };

async function main() {
  const apply = process.argv.includes('--apply');

  const counts = {
    dailyAttendance: await prisma.dailyAttendance.count({ where: { studentProfile: { user: emailFilter } } }),
    academicYears: await prisma.academicYear.count({ where: { OR: [{ name: E2E }, { name: EOS }] } }),
    terms: await prisma.term.count({ where: { OR: [{ name: E2E }, { name: EOS }] } }),
    assessments: await prisma.assessment.count({ where: { title: E2E } }),
    classes: await prisma.class.count({ where: { OR: [{ name: E2E }, { code: E2E }] } }),
    subjects: await prisma.subject.count({ where: { OR: [{ name: E2E }, { code: E2E }] } }),
    assessmentTypes: await prisma.assessmentType.count({ where: { OR: [{ name: E2E }, { code: E2E }] } }),
    batches: await prisma.batch.count({ where: { OR: [{ name: E2E }, { code: E2E }, { code: EOS }] } }),
    programs: await prisma.program.count({ where: { OR: [{ name: E2E }, { name: EOS }] } }),
    users: await prisma.user.count({ where: emailFilter }),
  };

  console.log(apply ? '🧹 Deleting e2e test pollution:' : '🔍 Dry run — rows that WOULD be deleted (pass --apply to delete):');
  console.table(counts);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    console.log('✅ Nothing to clean.');
    return;
  }

  if (!apply) {
    console.log('\nNo changes made. Re-run with --apply to delete.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // The one Restrict relation with a real row: must go before the user
    // (and therefore the student profile) it belongs to.
    await tx.dailyAttendance.deleteMany({ where: { studentProfile: { user: emailFilter } } });

    // Cascades: Term, ClassSection, StudentClassPlacement.
    await tx.academicYear.deleteMany({ where: { OR: [{ name: E2E }, { name: EOS }] } });
    // Defensive — cascade above should already have removed these.
    await tx.term.deleteMany({ where: { OR: [{ name: E2E }, { name: EOS }] } });

    // Cascades: AssessmentSection, AssessmentQuestion. Must precede the
    // Class/Subject/AssessmentType deletes below, which default to Restrict
    // against any Assessment still pointing at them.
    await tx.assessment.deleteMany({ where: { title: E2E } });

    await tx.class.deleteMany({ where: { OR: [{ name: E2E }, { code: E2E }] } });
    await tx.subject.deleteMany({ where: { OR: [{ name: E2E }, { code: E2E }] } });
    await tx.assessmentType.deleteMany({ where: { OR: [{ name: E2E }, { code: E2E }] } });

    // Cascades: BatchSession, BatchAttendance, StudentCourseEnrollment.
    // Entitlement/GradeBookEntry.batch are SetNull, not blocking.
    await tx.batch.deleteMany({ where: { OR: [{ name: E2E }, { code: E2E }, { code: EOS }] } });

    // Cascades: ClassSection, ProgramCourse, Entitlement, OrderItem.
    await tx.program.deleteMany({ where: { OR: [{ name: E2E }, { name: EOS }] } });

    // Cascades: StudentProfile, UserRole, UserIdentity, and every other
    // owned row — every direct `userId` FK in the schema is onDelete: Cascade.
    await tx.user.deleteMany({ where: emailFilter });
  });

  console.log('✅ Done.');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup aborted, nothing was committed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
