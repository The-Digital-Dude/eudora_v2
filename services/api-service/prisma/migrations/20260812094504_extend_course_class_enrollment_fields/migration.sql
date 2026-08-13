-- AlterTable
ALTER TABLE "course_classes" ADD COLUMN     "campusId" TEXT,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isOpenForEnrollment" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
