-- Retire Timetable.
--
-- `TimetableSlot` was a weekly recurrence rule. That was its only real value,
-- and `Batch.meetingDays` + session generation now does the same job while
-- producing actual meetings rather than a rule nobody materialised.
--
-- Its schedule reads were also already broken for the customers who matter:
-- `getStudentSchedule` resolved through `StudentClassPlacement`, which a
-- student who arrives through guardian checkout never gets, so their timetable
-- was always empty. Those reads now come from `BatchSession` via
-- `StudentCourseEnrollment`.
--
-- Teacher double-booking detection — the one thing worth keeping — moved to
-- `BatchSessionsService.assertNoTeacherClash`, which checks real session
-- windows instead of period indexes.
--
-- Room and period-index scheduling are dropped outright: physical-classroom
-- concepts with no place in an online product.
DROP TABLE IF EXISTS "timetable_slots";
DROP TABLE IF EXISTS "timetables";

DROP TYPE IF EXISTS "TimetableSlotStatus";
DROP TYPE IF EXISTS "TimetableStatus";
