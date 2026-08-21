-- A batch's weekly meeting pattern.
--
-- This is a *rule*, not a schedule: it is the input used to generate
-- `batch_sessions` rows across the batch's date range. Once generated, each
-- session is edited independently, so changing the pattern never silently
-- rewrites meetings a cohort has already been told about.
--
-- `meetingStartMinutes` is minutes past local midnight rather than a timestamp
-- so the pattern survives a daylight-saving shift: "every Tuesday at 16:00"
-- stays 16:00 either side of the clock change.
ALTER TABLE "batches"
    ADD COLUMN "meetingDays"            "DayOfWeek"[],
    ADD COLUMN "meetingStartMinutes"    INTEGER,
    ADD COLUMN "meetingDurationMinutes" INTEGER;
