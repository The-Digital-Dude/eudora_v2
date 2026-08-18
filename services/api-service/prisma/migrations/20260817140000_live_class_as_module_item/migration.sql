-- Live classes become curriculum, not roster.
--
-- A live class is now authored once as a `ModuleItem(kind: LIVE_CLASS)` inside
-- a chapter. The meeting itself moves onto `BatchSession`, because one item
-- resolves to a different meeting for every cohort that buys the course --
-- something `LiveClassSession -> ClassSection` could not express.
--
-- `live_class_sessions` is dropped rather than migrated: it holds a single
-- seeded row, and its `classSectionId` has no deterministic mapping onto a
-- batch. `assessment_assignments.classSectionId` and
-- `gradebook_entries.classSectionId` are dropped as redundant -- both tables
-- already carry the real target (`studentProfileId`, and `batchId` on the
-- gradebook), and holding both left nothing deciding which one won.

-- AlterEnum
ALTER TYPE "ModuleItemKind" ADD VALUE 'LIVE_CLASS';

-- AlterTable: BatchSession absorbs the meeting fields from LiveClassSession
ALTER TABLE "batch_sessions"
    ADD COLUMN "moduleItemId"      TEXT,
    ADD COLUMN "teacherUserId"     TEXT,
    ADD COLUMN "status"            "LiveClassStatus"   NOT NULL DEFAULT 'SCHEDULED',
    ADD COLUMN "provider"          "LiveClassProvider" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "externalMeetingId" TEXT,
    ADD COLUMN "joinUrl"           TEXT,
    ADD COLUMN "startUrl"          TEXT,
    ADD COLUMN "cancelledAt"       TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "batch_sessions_moduleItemId_idx" ON "batch_sessions"("moduleItemId");

-- CreateIndex
CREATE INDEX "batch_sessions_teacherUserId_date_idx" ON "batch_sessions"("teacherUserId", "date");

-- AddForeignKey
ALTER TABLE "batch_sessions" ADD CONSTRAINT "batch_sessions_moduleItemId_fkey" FOREIGN KEY ("moduleItemId") REFERENCES "module_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_sessions" ADD CONSTRAINT "batch_sessions_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable
DROP TABLE "live_class_sessions";

-- DropIndex
DROP INDEX IF EXISTS "gradebook_entries_classSectionId_termId_idx";

-- AlterTable: drop the redundant section FKs
ALTER TABLE "assessment_assignments" DROP COLUMN "classSectionId";
ALTER TABLE "gradebook_entries" DROP COLUMN "classSectionId";
