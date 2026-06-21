-- CreateIndex
CREATE INDEX "course_class_sessions_courseClassId_date_idx" ON "course_class_sessions"("courseClassId", "date");

-- CreateIndex
CREATE INDEX "daily_attendance_classSectionId_date_idx" ON "daily_attendance"("classSectionId", "date");

-- CreateIndex
CREATE INDEX "daily_attendance_studentProfileId_date_idx" ON "daily_attendance"("studentProfileId", "date");
