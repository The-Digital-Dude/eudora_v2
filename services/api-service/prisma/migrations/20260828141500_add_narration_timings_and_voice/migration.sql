-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "narratorVoiceId" TEXT;

-- AlterTable
ALTER TABLE "story_segments" ADD COLUMN     "narrationTimings" JSONB;

