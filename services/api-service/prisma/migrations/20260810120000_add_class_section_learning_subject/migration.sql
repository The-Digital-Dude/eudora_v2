-- AlterTable
ALTER TABLE "class_sections" ADD COLUMN     "learningSubjectId" TEXT;

-- CreateIndex
CREATE INDEX "class_sections_learningSubjectId_idx" ON "class_sections"("learningSubjectId");

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_learningSubjectId_fkey" FOREIGN KEY ("learningSubjectId") REFERENCES "learning_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
