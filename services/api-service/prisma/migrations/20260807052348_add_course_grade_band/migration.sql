-- CreateEnum
CREATE TYPE "GradeBand" AS ENUM ('PRE_K_K', 'G1_2', 'G3_4', 'G5_6');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "gradeBand" "GradeBand";
