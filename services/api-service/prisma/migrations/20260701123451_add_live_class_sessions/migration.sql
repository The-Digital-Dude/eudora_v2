-- CreateEnum
CREATE TYPE "LiveClassStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LiveClassProvider" AS ENUM ('NONE', 'ZOOM');

-- CreateTable
CREATE TABLE "live_class_sessions" (
    "id" TEXT NOT NULL,
    "classSectionId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3) NOT NULL,
    "status" "LiveClassStatus" NOT NULL DEFAULT 'SCHEDULED',
    "provider" "LiveClassProvider" NOT NULL DEFAULT 'NONE',
    "externalMeetingId" TEXT,
    "joinUrl" TEXT,
    "startUrl" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_class_sessions_classSectionId_scheduledStartAt_idx" ON "live_class_sessions"("classSectionId", "scheduledStartAt");

-- CreateIndex
CREATE INDEX "live_class_sessions_teacherUserId_scheduledStartAt_idx" ON "live_class_sessions"("teacherUserId", "scheduledStartAt");

-- AddForeignKey
ALTER TABLE "live_class_sessions" ADD CONSTRAINT "live_class_sessions_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "class_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_class_sessions" ADD CONSTRAINT "live_class_sessions_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
