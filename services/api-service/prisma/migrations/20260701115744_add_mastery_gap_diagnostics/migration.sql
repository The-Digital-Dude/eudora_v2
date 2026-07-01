-- CreateEnum
CREATE TYPE "MasteryStatus" AS ENUM ('NOT_STARTED', 'INTRODUCED', 'DEVELOPING', 'NEAR_MASTERY', 'MASTERED');

-- CreateEnum
CREATE TYPE "GapSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "GapStatus" AS ENUM ('OPEN', 'ADDRESSING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NextActionType" AS ENUM ('REVIEW', 'REASSESS', 'INTERVENTION', 'PRACTICE');

-- CreateEnum
CREATE TYPE "NextActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlacementRecStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'OVERRIDDEN');

-- AlterTable
ALTER TABLE "competency_masteries" ADD COLUMN     "status" "MasteryStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "mastery_status_changes" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "fromStatus" "MasteryStatus" NOT NULL,
    "toStatus" "MasteryStatus" NOT NULL,
    "masteryScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "evidenceId" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastery_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_gaps" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "severity" "GapSeverity" NOT NULL DEFAULT 'MEDIUM',
    "rootCause" TEXT NOT NULL,
    "status" "GapStatus" NOT NULL DEFAULT 'OPEN',
    "detectedFrom" TEXT NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "learning_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "next_actions" (
    "id" TEXT NOT NULL,
    "gapId" TEXT,
    "studentProfileId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "actionType" "NextActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reassessmentPlan" TEXT,
    "status" "NextActionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "next_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_recommendations" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "leadId" TEXT,
    "assessmentAttemptId" TEXT NOT NULL,
    "recommendedLevelId" TEXT NOT NULL,
    "recommendedClassSectionId" TEXT,
    "rationale" TEXT NOT NULL,
    "status" "PlacementRecStatus" NOT NULL DEFAULT 'SUGGESTED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mastery_status_changes_studentProfileId_competencyId_create_idx" ON "mastery_status_changes"("studentProfileId", "competencyId", "createdAt");

-- CreateIndex
CREATE INDEX "learning_gaps_studentProfileId_status_idx" ON "learning_gaps"("studentProfileId", "status");

-- CreateIndex
CREATE INDEX "learning_gaps_competencyId_status_idx" ON "learning_gaps"("competencyId", "status");

-- CreateIndex
CREATE INDEX "next_actions_ownerUserId_status_idx" ON "next_actions"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "next_actions_studentProfileId_status_idx" ON "next_actions"("studentProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "placement_recommendations_assessmentAttemptId_key" ON "placement_recommendations"("assessmentAttemptId");

-- AddForeignKey
ALTER TABLE "mastery_status_changes" ADD CONSTRAINT "mastery_status_changes_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mastery_status_changes" ADD CONSTRAINT "mastery_status_changes_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_gaps" ADD CONSTRAINT "learning_gaps_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_gaps" ADD CONSTRAINT "learning_gaps_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "learning_gaps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_recommendations" ADD CONSTRAINT "placement_recommendations_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_recommendations" ADD CONSTRAINT "placement_recommendations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_recommendations" ADD CONSTRAINT "placement_recommendations_assessmentAttemptId_fkey" FOREIGN KEY ("assessmentAttemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_recommendations" ADD CONSTRAINT "placement_recommendations_recommendedLevelId_fkey" FOREIGN KEY ("recommendedLevelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_recommendations" ADD CONSTRAINT "placement_recommendations_recommendedClassSectionId_fkey" FOREIGN KEY ("recommendedClassSectionId") REFERENCES "class_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
