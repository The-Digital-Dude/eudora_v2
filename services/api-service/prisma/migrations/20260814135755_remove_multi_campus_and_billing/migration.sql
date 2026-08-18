-- DropForeignKey
ALTER TABLE "campus_courses" DROP CONSTRAINT "campus_courses_campusId_fkey";

-- DropForeignKey
ALTER TABLE "campus_courses" DROP CONSTRAINT "campus_courses_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_classes" DROP CONSTRAINT "course_classes_campusId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_campusId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_campusId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_planId_fkey";

-- AlterTable
ALTER TABLE "course_classes" DROP COLUMN "campusId";

-- AlterTable
ALTER TABLE "programs" DROP COLUMN "campusId";

-- DropTable
DROP TABLE "campus_courses";

-- DropTable
DROP TABLE "campuses";

-- DropTable
DROP TABLE "invoices";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "plans";

-- DropTable
DROP TABLE "stripe_events";

-- DropTable
DROP TABLE "subscriptions";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PlanInterval";

-- DropEnum
DROP TYPE "SubscriptionStatus";

