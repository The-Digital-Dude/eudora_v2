-- CreateEnum
CREATE TYPE "DevicePairingStatus" AS ENUM ('PENDING', 'APPROVED', 'EXPIRED');

-- CreateTable
CREATE TABLE "device_pairing_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "status" "DevicePairingStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_codes_code_key" ON "device_pairing_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_codes_deviceCodeHash_key" ON "device_pairing_codes"("deviceCodeHash");

-- AddForeignKey
ALTER TABLE "device_pairing_codes" ADD CONSTRAINT "device_pairing_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
