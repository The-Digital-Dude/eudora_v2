-- AlterTable
ALTER TABLE "campuses" ADD COLUMN     "address" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "campuses_code_key" ON "campuses"("code");
