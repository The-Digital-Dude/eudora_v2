-- Homework becomes a chapter checkpoint, not only a cohort assignment.
--
-- `homeworks.batchId` was NOT NULL, so homework could only ever belong to a
-- batch. A self-paced learner has no batch, which meant the entire self-paced
-- audience -- the ordinary case for a guardian buying a course -- could not be
-- set homework at all.
--
-- It can now hang off a `module_items` row instead: the same slot mechanism
-- that already carries ASSESSMENT and LIVE_CLASS items inside a chapter.
-- Exactly one parent is set. One table still serves both shapes, because the
-- submission, grading and gradebook paths are identical either way.
--
-- `dueDate` becomes nullable for the same reason: a checkpoint reached at the
-- learner's own pace has no calendar deadline. Cohort homework still sets one.

-- AlterEnum
ALTER TYPE "ModuleItemKind" ADD VALUE 'HOMEWORK';

-- AlterTable
ALTER TABLE "homeworks"
    ADD COLUMN "moduleItemId" TEXT,
    ALTER COLUMN "batchId" DROP NOT NULL,
    ALTER COLUMN "dueDate" DROP NOT NULL;

-- One brief per checkpoint.
CREATE UNIQUE INDEX "homeworks_moduleItemId_key" ON "homeworks"("moduleItemId");

-- Cascade matches the batch side: deleting the slot removes the brief that
-- only existed to describe it.
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_moduleItemId_fkey"
    FOREIGN KEY ("moduleItemId") REFERENCES "module_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one parent, enforced in the database rather than trusted to callers.
-- Existing rows all carry a batchId and no moduleItemId, so they satisfy this
-- as they stand.
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_one_parent"
    CHECK (("moduleItemId" IS NULL) <> ("batchId" IS NULL));
