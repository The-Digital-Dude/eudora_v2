-- Phase 1 of the commerce initiative: the access grant.
--
-- Course content is currently readable by any authenticated user, so without
-- this a purchase would buy something the buyer already has. Every content
-- route resolves through `EntitlementService` after this lands.

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('PURCHASE', 'ADMIN_GRANT', 'TRIAL', 'PROMO');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'EXPIRED', 'REVOKED');

-- AlterTable
-- A course page with nothing playable converts badly and gives search engines
-- nothing to index, so specific items are deliberately given away.
ALTER TABLE "module_items" ADD COLUMN     "isFreePreview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "programId" TEXT,
    "courseId" TEXT,
    "courseClassId" TEXT,
    "source" "EntitlementSource" NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessExpiresAt" TIMESTAMP(3),
    "paidThroughDate" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- An entitlement grants exactly one thing: a Program or a Course, never both
-- and never neither. Prisma cannot express this, so it is enforced here rather
-- than left to every caller to remember.
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_exactly_one_target"
  CHECK (("programId" IS NOT NULL) <> ("courseId" IS NOT NULL));

-- CreateIndex
CREATE INDEX "entitlements_studentProfileId_status_idx" ON "entitlements"("studentProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_studentProfileId_programId_key" ON "entitlements"("studentProfileId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_studentProfileId_courseId_key" ON "entitlements"("studentProfileId", "courseId");

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_courseClassId_fkey" FOREIGN KEY ("courseClassId") REFERENCES "course_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
