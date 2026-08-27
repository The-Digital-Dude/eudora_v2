-- DropForeignKey
ALTER TABLE "makeup_requests" DROP CONSTRAINT "makeup_requests_batchId_fkey";

-- DropForeignKey
ALTER TABLE "makeup_requests" DROP CONSTRAINT "makeup_requests_studentProfileId_fkey";

-- DropTable
DROP TABLE "makeup_requests";
