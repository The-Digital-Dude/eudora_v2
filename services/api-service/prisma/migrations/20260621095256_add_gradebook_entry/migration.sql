-- CreateEnum
CREATE TYPE "GradeSourceType" AS ENUM ('HOMEWORK_SUBMISSION', 'ASSESSMENT_ATTEMPT', 'RUBRIC_ASSESSMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "GradeBookEntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'EXCLUDED');

-- CreateTable
CREATE TABLE "gradebook_entries" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "classSectionId" TEXT,
    "courseClassId" TEXT,
    "termId" TEXT,
    "sourceType" "GradeSourceType" NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "pointsEarned" DOUBLE PRECISION,
    "pointsPossible" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "GradeBookEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "assessedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gradebook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gradebook_entries_courseClassId_termId_idx" ON "gradebook_entries"("courseClassId", "termId");

-- CreateIndex
CREATE INDEX "gradebook_entries_classSectionId_termId_idx" ON "gradebook_entries"("classSectionId", "termId");

-- CreateIndex
CREATE INDEX "gradebook_entries_studentProfileId_termId_idx" ON "gradebook_entries"("studentProfileId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "gradebook_entries_studentProfileId_sourceType_sourceId_key" ON "gradebook_entries"("studentProfileId", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "gradebook_entries" ADD CONSTRAINT "gradebook_entries_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradebook_entries" ADD CONSTRAINT "gradebook_entries_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "class_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradebook_entries" ADD CONSTRAINT "gradebook_entries_courseClassId_fkey" FOREIGN KEY ("courseClassId") REFERENCES "course_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradebook_entries" ADD CONSTRAINT "gradebook_entries_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
