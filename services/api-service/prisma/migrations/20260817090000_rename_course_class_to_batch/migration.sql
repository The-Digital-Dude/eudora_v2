-- Rename `CourseClass` to `Batch`, in place.
--
-- Three unrelated models shared the word "class": `Class` (the grade level),
-- `ClassSection` (the roster) and `CourseClass` (a dated cohort). The cohort
-- has been called a "batch" in the product and UI since the commerce work;
-- this makes the database agree.
--
-- Hand-written because `prisma migrate dev` renders renames as DROP + CREATE,
-- which would destroy every enrolment, session, attendance record, homework
-- and gradebook entry hanging off these tables.

-- ─── Enum ────────────────────────────────────────────────────────────────────
ALTER TYPE "CourseClassStatus" RENAME TO "BatchStatus";

-- ─── Tables ──────────────────────────────────────────────────────────────────
ALTER TABLE "course_classes" RENAME TO "batches";
ALTER TABLE "course_class_sessions" RENAME TO "batch_sessions";
ALTER TABLE "course_class_attendance" RENAME TO "batch_attendance";

-- ─── Foreign-key columns ─────────────────────────────────────────────────────
-- Every table that points at a batch.
ALTER TABLE "batch_sessions" RENAME COLUMN "courseClassId" TO "batchId";
ALTER TABLE "entitlements" RENAME COLUMN "courseClassId" TO "batchId";
ALTER TABLE "gradebook_entries" RENAME COLUMN "courseClassId" TO "batchId";
ALTER TABLE "homeworks" RENAME COLUMN "courseClassId" TO "batchId";
ALTER TABLE "makeup_requests" RENAME COLUMN "courseClassId" TO "batchId";
ALTER TABLE "order_items" RENAME COLUMN "courseClassId" TO "batchId";
ALTER TABLE "student_course_enrollments" RENAME COLUMN "courseClassId" TO "batchId";
ALTER TABLE "timetable_slots" RENAME COLUMN "courseClassId" TO "batchId";

-- ─── Primary keys ────────────────────────────────────────────────────────────
ALTER TABLE "batches" RENAME CONSTRAINT "course_classes_pkey" TO "batches_pkey";
ALTER TABLE "batch_sessions" RENAME CONSTRAINT "course_class_sessions_pkey" TO "batch_sessions_pkey";
ALTER TABLE "batch_attendance" RENAME CONSTRAINT "course_class_attendance_pkey" TO "batch_attendance_pkey";

-- ─── Foreign-key constraints ─────────────────────────────────────────────────
ALTER TABLE "batches" RENAME CONSTRAINT "course_classes_courseId_fkey" TO "batches_courseId_fkey";
ALTER TABLE "batches" RENAME CONSTRAINT "course_classes_termId_fkey" TO "batches_termId_fkey";
ALTER TABLE "batches" RENAME CONSTRAINT "course_classes_leadTeacherProfileId_fkey" TO "batches_leadTeacherProfileId_fkey";

ALTER TABLE "batch_sessions" RENAME CONSTRAINT "course_class_sessions_courseClassId_fkey" TO "batch_sessions_batchId_fkey";
ALTER TABLE "batch_attendance" RENAME CONSTRAINT "course_class_attendance_sessionId_fkey" TO "batch_attendance_sessionId_fkey";
ALTER TABLE "batch_attendance" RENAME CONSTRAINT "course_class_attendance_studentProfileId_fkey" TO "batch_attendance_studentProfileId_fkey";

ALTER TABLE "entitlements" RENAME CONSTRAINT "entitlements_courseClassId_fkey" TO "entitlements_batchId_fkey";
ALTER TABLE "gradebook_entries" RENAME CONSTRAINT "gradebook_entries_courseClassId_fkey" TO "gradebook_entries_batchId_fkey";
ALTER TABLE "homeworks" RENAME CONSTRAINT "homeworks_courseClassId_fkey" TO "homeworks_batchId_fkey";
ALTER TABLE "makeup_requests" RENAME CONSTRAINT "makeup_requests_courseClassId_fkey" TO "makeup_requests_batchId_fkey";
ALTER TABLE "student_course_enrollments" RENAME CONSTRAINT "student_course_enrollments_courseClassId_fkey" TO "student_course_enrollments_batchId_fkey";
ALTER TABLE "timetable_slots" RENAME CONSTRAINT "timetable_slots_courseClassId_fkey" TO "timetable_slots_batchId_fkey";

-- ─── Indexes ─────────────────────────────────────────────────────────────────
ALTER INDEX "course_classes_code_key" RENAME TO "batches_code_key";
ALTER INDEX "course_classes_courseId_status_idx" RENAME TO "batches_courseId_status_idx";
ALTER INDEX "course_classes_startDate_idx" RENAME TO "batches_startDate_idx";
ALTER INDEX "course_class_sessions_courseClassId_date_idx" RENAME TO "batch_sessions_batchId_date_idx";
ALTER INDEX "course_class_attendance_studentProfileId_sessionId_key" RENAME TO "batch_attendance_studentProfileId_sessionId_key";

-- Composite indexes on the referencing tables carry the old column name too.
ALTER INDEX "gradebook_entries_courseClassId_termId_idx" RENAME TO "gradebook_entries_batchId_termId_idx";
ALTER INDEX "student_course_enrollments_studentProfileId_courseClassId_key" RENAME TO "student_course_enrollments_studentProfileId_batchId_key";
