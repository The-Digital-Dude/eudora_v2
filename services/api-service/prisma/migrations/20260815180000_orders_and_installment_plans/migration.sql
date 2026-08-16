-- Phase 2 of the commerce initiative: orders, installment plans and the
-- Stripe webhook idempotency ledger.
--
-- Order is keyed to the guardian who pays; the Entitlement it produces is keyed
-- to the student who consumes.

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('ONE_TIME', 'INSTALLMENT', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAST_DUE', 'CANCELLED');

-- AlterTable
ALTER TABLE "entitlements" ADD COLUMN     "orderItemId" TEXT;

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeCheckoutSessionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "programId" TEXT,
    "courseId" TEXT,
    "courseClassId" TEXT,
    "billingMode" "BillingMode" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "installmentCount" INTEGER,
    "creditAppliedCents" INTEGER NOT NULL DEFAULT 0,
    "creditFromEntitlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentsPaid" INTEGER NOT NULL DEFAULT 0,
    "amountPerInstallmentCents" INTEGER NOT NULL,
    "finalInstallmentCents" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "paidThroughDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripeCheckoutSessionId_key" ON "orders"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "orders_guardianUserId_status_idx" ON "orders"("guardianUserId", "status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "installment_plans_orderItemId_key" ON "installment_plans"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "installment_plans_stripeSubscriptionId_key" ON "installment_plans"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripeEventId_key" ON "stripe_webhook_events"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_orderItemId_key" ON "entitlements"("orderItemId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- An order item grants exactly one thing, mirroring the same rule on
-- entitlements. Enforced here because Prisma cannot express it.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_exactly_one_target"
  CHECK (("programId" IS NOT NULL) <> ("courseId" IS NOT NULL));
