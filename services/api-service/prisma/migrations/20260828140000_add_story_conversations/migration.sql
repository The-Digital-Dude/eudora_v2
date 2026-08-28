-- CreateTable
CREATE TABLE "story_conversations" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "demoSessionId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_turns" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "childText" TEXT NOT NULL,
    "replyText" TEXT NOT NULL,
    "segmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_conversations_storyId_idx" ON "story_conversations"("storyId");

-- CreateIndex
CREATE INDEX "story_conversations_studentProfileId_idx" ON "story_conversations"("studentProfileId");

-- CreateIndex
CREATE INDEX "story_conversations_demoSessionId_idx" ON "story_conversations"("demoSessionId");

-- CreateIndex
CREATE INDEX "story_conversations_isDemo_createdAt_idx" ON "story_conversations"("isDemo", "createdAt");

-- CreateIndex
CREATE INDEX "story_turns_createdAt_idx" ON "story_turns"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "story_turns_conversationId_sortOrder_key" ON "story_turns"("conversationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "story_conversations" ADD CONSTRAINT "story_conversations_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_conversations" ADD CONSTRAINT "story_conversations_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_turns" ADD CONSTRAINT "story_turns_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "story_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

