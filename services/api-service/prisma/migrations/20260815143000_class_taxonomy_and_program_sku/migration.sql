-- Phase 0 of the commerce initiative: collapse three competing level concepts
-- into one `Class` master, invert the hierarchy to Class -> Program -> Course,
-- and give Program the fields it needs to be a sellable SKU.
--
-- Hand-written rather than generated: `prisma migrate dev` renders table and
-- column renames as DROP + CREATE, which would discard every Level row and
-- every assessment/question FK pointing at it.

-- ─── 1. Delivery mode ────────────────────────────────────────────────────────
CREATE TYPE "DeliveryMode" AS ENUM ('SELF_PACED', 'LIVE', 'HYBRID');

-- ─── 2. Level -> Class (rename in place; rows and FK values survive) ─────────
-- Level rows were always grade levels (K, G1, G3, G5, G10, G11) — exactly what
-- Class is — so this is a rename-and-extend, not a data rebuild.
ALTER TABLE "levels" RENAME TO "classes";
ALTER TABLE "classes" RENAME CONSTRAINT "levels_pkey" TO "classes_pkey";
ALTER INDEX "levels_code_key" RENAME TO "classes_code_key";

ALTER TABLE "classes" ADD COLUMN "slug" TEXT;
ALTER TABLE "classes" ADD COLUMN "description" TEXT;

UPDATE "classes"
SET "slug" = trim(BOTH '-' FROM lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')));

ALTER TABLE "classes" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "classes_slug_key" ON "classes"("slug");

-- status: free-text 'active' -> CatalogStatus, so a Class can be drafted
-- without leaking into the public catalog.
ALTER TABLE "classes" ADD COLUMN "status_tmp" "CatalogStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "classes"
SET "status_tmp" = CASE WHEN "status" = 'active' THEN 'PUBLISHED'::"CatalogStatus"
                        ELSE 'ARCHIVED'::"CatalogStatus" END;
ALTER TABLE "classes" DROP COLUMN "status";
ALTER TABLE "classes" RENAME COLUMN "status_tmp" TO "status";

-- ─── 3. Repoint the FKs that used to be named "level" ───────────────────────
ALTER TABLE "assessments" RENAME COLUMN "levelId" TO "classId";
ALTER TABLE "assessments" RENAME CONSTRAINT "assessments_levelId_fkey" TO "assessments_classId_fkey";

ALTER TABLE "questions" RENAME COLUMN "levelId" TO "classId";
ALTER TABLE "questions" RENAME CONSTRAINT "questions_levelId_fkey" TO "questions_classId_fkey";

ALTER TABLE "placement_recommendations" RENAME COLUMN "recommendedLevelId" TO "recommendedClassId";
ALTER TABLE "placement_recommendations"
  RENAME CONSTRAINT "placement_recommendations_recommendedLevelId_fkey"
  TO "placement_recommendations_recommendedClassId_fkey";

-- ─── 4. Program becomes the sellable SKU ────────────────────────────────────
ALTER TABLE "programs" ADD COLUMN "classId" TEXT;
ALTER TABLE "programs" ADD COLUMN "slug" TEXT;
ALTER TABLE "programs" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "programs" ADD COLUMN "description" TEXT;
ALTER TABLE "programs" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "programs" ADD COLUMN "outcomes" TEXT[];
ALTER TABLE "programs" ADD COLUMN "syllabusFileId" TEXT;
ALTER TABLE "programs" ADD COLUMN "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'SELF_PACED';
ALTER TABLE "programs" ADD COLUMN "durationMonths" INTEGER;
ALTER TABLE "programs" ADD COLUMN "priceOneTimeCents" INTEGER;
ALTER TABLE "programs" ADD COLUMN "priceMonthlyCents" INTEGER;
ALTER TABLE "programs" ADD COLUMN "installmentCount" INTEGER;
ALTER TABLE "programs" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "programs" ADD COLUMN "stripeProductId" TEXT;
ALTER TABLE "programs" ADD COLUMN "stripePriceOneTimeId" TEXT;
ALTER TABLE "programs" ADD COLUMN "stripePriceMonthlyId" TEXT;

UPDATE "programs"
SET "slug" = trim(BOTH '-' FROM lower(regexp_replace("code", '[^a-zA-Z0-9]+', '-', 'g')));

ALTER TABLE "programs" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "programs_slug_key" ON "programs"("slug");

-- status: EducationalInstitutionStatus -> CatalogStatus. Program is now public
-- and indexable, so it needs a DRAFT state that ACTIVE/INACTIVE never had.
ALTER TABLE "programs" ADD COLUMN "status_tmp" "CatalogStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "programs"
SET "status_tmp" = CASE WHEN "status" = 'ACTIVE' THEN 'PUBLISHED'::"CatalogStatus"
                        ELSE 'ARCHIVED'::"CatalogStatus" END;
ALTER TABLE "programs" DROP COLUMN "status";
ALTER TABLE "programs" RENAME COLUMN "status_tmp" TO "status";

-- Backfill classId only where every live section under a program agrees on one
-- grade. A program whose sections span grades cannot invert cleanly, so it is
-- left null for an admin to resolve rather than guessed at.
UPDATE "programs" p
SET "classId" = c."id"
FROM (
  SELECT cs."programId" AS pid, MIN(cs."class") AS cls
  FROM "class_sections" cs
  WHERE cs."class" IS NOT NULL AND cs."deletedAt" IS NULL
  GROUP BY cs."programId"
  HAVING COUNT(DISTINCT cs."class") = 1
) agreed
JOIN "classes" c ON c."name" = agreed.cls
WHERE p."id" = agreed.pid;

ALTER TABLE "programs" ADD CONSTRAINT "programs_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programs" ADD CONSTRAINT "programs_syllabusFileId_fkey"
  FOREIGN KEY ("syllabusFileId") REFERENCES "file_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "programs_classId_idx" ON "programs"("classId");
CREATE INDEX "programs_status_idx" ON "programs"("status");

-- ─── 5. ProgramCourse — Courses are reusable across Programs ────────────────
CREATE TABLE "program_courses" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "program_courses_programId_courseId_key" ON "program_courses"("programId", "courseId");
CREATE INDEX "program_courses_courseId_idx" ON "program_courses"("courseId");

ALTER TABLE "program_courses" ADD CONSTRAINT "program_courses_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_courses" ADD CONSTRAINT "program_courses_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 6. Course: calendar duration + a-la-carte commerce fields ──────────────
-- `estimatedHours` (content effort) is kept and is deliberately distinct from
-- `durationWeeks` (calendar length). Null prices mean the Course is not sold
-- standalone and is only reachable through a Program.
ALTER TABLE "courses" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "courses" ADD COLUMN "durationWeeks" INTEGER;
ALTER TABLE "courses" ADD COLUMN "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'SELF_PACED';
ALTER TABLE "courses" ADD COLUMN "priceOneTimeCents" INTEGER;
ALTER TABLE "courses" ADD COLUMN "priceMonthlyCents" INTEGER;
ALTER TABLE "courses" ADD COLUMN "installmentCount" INTEGER;
ALTER TABLE "courses" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "courses" ADD COLUMN "stripeProductId" TEXT;
ALTER TABLE "courses" ADD COLUMN "stripePriceOneTimeId" TEXT;
ALTER TABLE "courses" ADD COLUMN "stripePriceMonthlyId" TEXT;

CREATE INDEX "courses_gradeBand_idx" ON "courses"("gradeBand");
CREATE INDEX "courses_status_idx" ON "courses"("status");
