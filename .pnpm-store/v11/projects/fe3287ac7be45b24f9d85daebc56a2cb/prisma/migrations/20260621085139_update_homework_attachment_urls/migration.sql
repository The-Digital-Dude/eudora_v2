/*
  Warnings:

  - You are about to drop the column `attachmentUrl` on the `homeworks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "homeworks" DROP COLUMN "attachmentUrl",
ADD COLUMN     "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
