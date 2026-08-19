-- Teaching access becomes an application, not a signup.
--
-- Self-signup has always been restricted to USER and GUARDIAN, so the only way
-- to become a teacher was for an administrator to create the account outright.
-- This adds the missing front door: anyone can apply, attaching a CV, and the
-- TEACHER role plus the teacher_profiles row are created only when a reviewer
-- approves. Submitting an application grants nothing on its own -- the role
-- reaches student names, attendance and grades, so it stays a human decision.
--
-- file_uploads.url becomes nullable because a CV is stored privately: there is
-- no public URL to record, and a placeholder in that column would eventually be
-- rendered as one. Private objects are reached through a short-lived signed URL.

-- AlterTable: file_uploads learns about private objects
ALTER TABLE "file_uploads"
    ALTER COLUMN "url" DROP NOT NULL,
    ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "TeacherApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "teacher_applications" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "fullName"        TEXT NOT NULL,
    "phone"           TEXT,
    "specialization"  TEXT,
    "yearsExperience" INTEGER,
    "bio"             TEXT,
    "resumeFileId"    TEXT NOT NULL,
    "status"          "TeacherApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes"     TEXT,
    "reviewedById"    TEXT,
    "reviewedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_applications_pkey" PRIMARY KEY ("id")
);

-- One open application per account; a reconsidered applicant has this row
-- reopened rather than filing a second.
CREATE UNIQUE INDEX "teacher_applications_userId_key" ON "teacher_applications"("userId");

-- One application per CV, so a stored file cannot be re-pointed at another.
CREATE UNIQUE INDEX "teacher_applications_resumeFileId_key" ON "teacher_applications"("resumeFileId");

-- The review queue reads pending-first, oldest-first.
CREATE INDEX "teacher_applications_status_createdAt_idx" ON "teacher_applications"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "teacher_applications" ADD CONSTRAINT "teacher_applications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A reviewer who later leaves must not take the audit trail's row with them.
ALTER TABLE "teacher_applications" ADD CONSTRAINT "teacher_applications_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Restrict, not cascade: deleting the CV row out from under a decision would
-- leave an approval nobody can justify.
ALTER TABLE "teacher_applications" ADD CONSTRAINT "teacher_applications_resumeFileId_fkey"
    FOREIGN KEY ("resumeFileId") REFERENCES "file_uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
