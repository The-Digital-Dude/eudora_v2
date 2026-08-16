-- Phase 5: weld the catalogue tree to the operational one.
--
-- `course_classes` gains `courseId` — the link that was missing between
-- Course (catalogue) and CourseClass (operations) — plus cohort dates and a
-- lead teacher. `course_teachers` is the many-to-many that "one course, many
-- teachers" actually needed; a cohort system was never the right tool for it.
--
-- NOTE: the termId foreign key changes from ON DELETE CASCADE to SET NULL.
-- Deleting a Term previously destroyed its batches, cascading on into
-- enrollments, sessions, homework and gradebook entries. Orphaning the batch
-- is both safer and required now that a rolling batch may have no term.


-- DropForeignKey
ALTER TABLE "course_classes" DROP CONSTRAINT "course_classes_termId_fkey";

-- AlterTable
ALTER TABLE "course_classes" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "enrollmentDeadline" TIMESTAMP(3),
ADD COLUMN     "leadTeacherProfileId" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "termId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "course_teachers" (
    "courseId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'LEAD',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_teachers_pkey" PRIMARY KEY ("courseId","teacherProfileId")
);

-- CreateIndex
CREATE INDEX "course_teachers_teacherProfileId_idx" ON "course_teachers"("teacherProfileId");

-- CreateIndex
CREATE INDEX "course_classes_courseId_status_idx" ON "course_classes"("courseId", "status");

-- CreateIndex
CREATE INDEX "course_classes_startDate_idx" ON "course_classes"("startDate");

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_leadTeacherProfileId_fkey" FOREIGN KEY ("leadTeacherProfileId") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

