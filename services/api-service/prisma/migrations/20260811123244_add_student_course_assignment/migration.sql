-- CreateTable
CREATE TABLE "student_course_assignments" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_course_assignments_studentProfileId_courseId_key" ON "student_course_assignments"("studentProfileId", "courseId");

-- AddForeignKey
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
