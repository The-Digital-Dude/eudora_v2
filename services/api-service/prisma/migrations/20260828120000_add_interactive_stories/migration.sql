-- CreateEnum
CREATE TYPE "StoryAssetKind" AS ENUM ('ILLUSTRATION', 'BACKGROUND', 'AUDIO');

-- AlterEnum
ALTER TYPE "ModuleItemKind" ADD VALUE 'STORY';

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "moduleItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "coverAssetId" TEXT,
    "gradeBand" "GradeBand",
    "agentGuidance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_chapters" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_segments" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "narrationAudioKey" TEXT,
    "narrationDurationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_assets" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "segmentId" TEXT,
    "kind" "StoryAssetKind" NOT NULL DEFAULT 'ILLUSTRATION',
    "storageKey" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_characters" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "story_characters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stories_moduleItemId_key" ON "stories"("moduleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stories_coverAssetId_key" ON "stories"("coverAssetId");

-- CreateIndex
CREATE INDEX "story_chapters_storyId_idx" ON "story_chapters"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "story_chapters_storyId_sortOrder_key" ON "story_chapters"("storyId", "sortOrder");

-- CreateIndex
CREATE INDEX "story_segments_chapterId_idx" ON "story_segments"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "story_segments_chapterId_sortOrder_key" ON "story_segments"("chapterId", "sortOrder");

-- CreateIndex
CREATE INDEX "story_assets_storyId_idx" ON "story_assets"("storyId");

-- CreateIndex
CREATE INDEX "story_assets_segmentId_idx" ON "story_assets"("segmentId");

-- CreateIndex
CREATE INDEX "story_characters_storyId_idx" ON "story_characters"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "story_characters_storyId_name_key" ON "story_characters"("storyId", "name");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_moduleItemId_fkey" FOREIGN KEY ("moduleItemId") REFERENCES "module_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "story_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapters" ADD CONSTRAINT "story_chapters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_segments" ADD CONSTRAINT "story_segments_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_assets" ADD CONSTRAINT "story_assets_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_assets" ADD CONSTRAINT "story_assets_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "story_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_characters" ADD CONSTRAINT "story_characters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

