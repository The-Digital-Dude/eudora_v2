-- CreateEnum
CREATE TYPE "ModuleItemKind" AS ENUM ('VIDEO', 'READING', 'DISCUSSION', 'ASSESSMENT');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "countsTowardGrade" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "maxAttempts" INTEGER;

-- CreateTable
CREATE TABLE "module_items" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "kind" "ModuleItemKind" NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "videoUrl" TEXT,
    "videoDurationSeconds" INTEGER,
    "readingContent" TEXT,
    "assessmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "module_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_item_progress" (
    "id" TEXT NOT NULL,
    "moduleItemId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastPositionSeconds" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_item_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_threads" (
    "id" TEXT NOT NULL,
    "moduleItemId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_posts" (
    "id" TEXT NOT NULL,
    "discussionThreadId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentPostId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_item_progress_moduleItemId_studentProfileId_key" ON "module_item_progress"("moduleItemId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_threads_moduleItemId_key" ON "discussion_threads"("moduleItemId");

-- AddForeignKey
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_item_progress" ADD CONSTRAINT "module_item_progress_moduleItemId_fkey" FOREIGN KEY ("moduleItemId") REFERENCES "module_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_item_progress" ADD CONSTRAINT "module_item_progress_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_moduleItemId_fkey" FOREIGN KEY ("moduleItemId") REFERENCES "module_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_discussionThreadId_fkey" FOREIGN KEY ("discussionThreadId") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_parentPostId_fkey" FOREIGN KEY ("parentPostId") REFERENCES "discussion_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
