-- Removes the per-campus B2B household/billing model, superseded by the
-- Stripe-backed Order/OrderItem/Entitlement flow (see the 2026-08-15
-- entitlements-and-free-preview and orders-and-installment-plans
-- migrations). Unreachable by any real guardian or admin: the seven
-- families/* API routes have no client page anywhere, and the only writers
-- of these five tables were the seed script and the e2e tests that existed
-- solely to exercise these same routes.

-- DropForeignKey
ALTER TABLE "family_guardians" DROP CONSTRAINT "family_guardians_familyId_fkey";

-- DropForeignKey
ALTER TABLE "family_guardians" DROP CONSTRAINT "family_guardians_guardianProfileId_fkey";

-- DropForeignKey
ALTER TABLE "family_invoices" DROP CONSTRAINT "family_invoices_familyId_fkey";

-- DropForeignKey
ALTER TABLE "family_payments" DROP CONSTRAINT "family_payments_familyId_fkey";

-- DropForeignKey
ALTER TABLE "family_students" DROP CONSTRAINT "family_students_familyId_fkey";

-- DropForeignKey
ALTER TABLE "family_students" DROP CONSTRAINT "family_students_studentProfileId_fkey";

-- DropTable
DROP TABLE "families";

-- DropTable
DROP TABLE "family_guardians";

-- DropTable
DROP TABLE "family_invoices";

-- DropTable
DROP TABLE "family_payments";

-- DropTable
DROP TABLE "family_students";

-- DropEnum
DROP TYPE "FamilyStatus";
