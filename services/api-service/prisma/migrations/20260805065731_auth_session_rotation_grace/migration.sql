-- AlterTable
ALTER TABLE "auth_sessions" ADD COLUMN     "previousRefreshTokenHash" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "auth_sessions_previousRefreshTokenHash_idx" ON "auth_sessions"("previousRefreshTokenHash");
