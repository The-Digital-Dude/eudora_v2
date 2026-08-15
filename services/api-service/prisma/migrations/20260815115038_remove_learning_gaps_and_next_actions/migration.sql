-- DropForeignKey
ALTER TABLE "learning_gaps" DROP CONSTRAINT "learning_gaps_competencyId_fkey";

-- DropForeignKey
ALTER TABLE "learning_gaps" DROP CONSTRAINT "learning_gaps_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "next_actions" DROP CONSTRAINT "next_actions_competencyId_fkey";

-- DropForeignKey
ALTER TABLE "next_actions" DROP CONSTRAINT "next_actions_gapId_fkey";

-- DropForeignKey
ALTER TABLE "next_actions" DROP CONSTRAINT "next_actions_ownerUserId_fkey";

-- DropForeignKey
ALTER TABLE "next_actions" DROP CONSTRAINT "next_actions_studentProfileId_fkey";

-- DropTable
DROP TABLE "learning_gaps";

-- DropTable
DROP TABLE "next_actions";

-- DropEnum
DROP TYPE "GapSeverity";

-- DropEnum
DROP TYPE "GapStatus";

-- DropEnum
DROP TYPE "NextActionStatus";

-- DropEnum
DROP TYPE "NextActionType";

