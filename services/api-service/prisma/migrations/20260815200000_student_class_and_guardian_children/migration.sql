-- Guardian-created children need a grade level, and the operational
-- StudentClassPlacement -> ClassSection path requires a Program and an
-- AcademicYear that a consumer signup does not have. This is the direct link.


-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "classId" TEXT;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;


CREATE INDEX "student_profiles_classId_idx" ON "student_profiles"("classId");
