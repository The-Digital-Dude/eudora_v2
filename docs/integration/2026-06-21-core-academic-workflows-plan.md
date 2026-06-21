# Core Academic Workflows Integration Plan

Date: 2026-06-21

## Goal

Make Eudora operational for daily school academic management by integrating timetable, attendance, homework, and gradebook into one coherent workflow.

The current codebase already has strong foundations: NestJS modules, Prisma domain models, RTK Query, dashboard pages, student learning pages, uploads, notifications, RBAC, and assessment attempts. The next phase should avoid rebuilding those pieces. The work should turn the existing academic primitives into daily-use workflows with clear role access, conflict validation, reporting, and grade aggregation.

## Current Application Feature Map

### Architecture

- Root project is split into `client` and `services/api-service`.
- Frontend is a Next app using App Router, Redux Toolkit Query, Tailwind, shadcn/Radix UI, Lucide, Recharts, and existing dashboard UI conventions.
- Backend is a NestJS API with Prisma ORM, PostgreSQL, global auth/roles/permissions guards, response envelope, validation pipe, uploads, notifications, and seeded RBAC.
- Client API calls go through `/api` and are rewritten to `NEXT_PUBLIC_API_URL` in `client/next.config.ts`.
- Shared RTK Query infrastructure lives in `client/src/features/auth/authApi.ts`; domain endpoints are injected from `client/src/features/dashboard/dashboardApi.ts` and `client/src/features/clio/clioApi.ts`.

### Existing Academic Setup

The backend already models and exposes:

- Campuses and programs.
- Academic years and terms.
- Class sections for homeroom/grade-section placement.
- Course classes for subject/class enrollment.
- Student profiles, placements, and enrollments.
- Teacher profiles and class-section assignments.
- Class-section roster lookup through `GET /class-sections/:id/roster`.

The frontend already has:

- `/students`: student CRUD plus placement/enrollment setup.
- `/teachers`: teacher CRUD plus class-section assignment setup.
- `/classes`: course class list plus make-up request queue.
- `/diagnostics`: assessment attempt overview.
- `/lessons` and `/learn`: lesson authoring and student active learning.

### Existing Attendance Capability

Backend exists:

- `AttendanceStatus`: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`.
- `DailyAttendance`: one row per student, class section, date.
- `CourseClassSession`: date/start/end/topic for course sessions.
- `CourseClassAttendance`: one row per student per course session.
- APIs:
  - `POST /attendance/daily`
  - `GET /attendance/daily/class-section/:classSectionId?date=YYYY-MM-DD`
  - `POST /attendance/sessions`
  - `GET /attendance/sessions/course-class/:courseClassId`
  - `POST /attendance/session-attendance`
  - `GET /attendance/session-attendance/session/:sessionId`
  - `GET /attendance/student/:studentProfileId/summary`

Gaps:

- No frontend RTK endpoints for attendance.
- No dedicated `/attendance` page.
- The `/classes` page displays a hard-coded attendance rate and does not record or report attendance.
- Summary API is student-only and basic. It does not provide class/date/month summary, absence trend series, heatmaps, or at-risk lists.
- No attendance e2e coverage found.

### Existing Homework Capability

Backend exists:

- `Homework`: course class, title, description, due date, max points, single `attachmentUrl`.
- `HomeworkSubmission`: homework, student, content, `attachmentUrls`, status, points, feedback, graded metadata.
- APIs:
  - `POST /homework`
  - `PATCH /homework/:id`
  - `GET /homework/course-class/:courseClassId`
  - `POST /homework/submit`
  - `GET /homework/submissions/homework/:homeworkId`
  - `PATCH /homework/submissions/:id/grade`
  - `GET /homework/student/:studentProfileId`
- Unit tests exist for create, submit, late marking, and grading.
- Upload backend and `FileUploader` component exist.

Gaps:

- No frontend RTK endpoints for homework.
- No `/homework` page.
- `SubmitHomeworkDto` accepts only text content, even though Prisma has `attachmentUrls`.
- `CreateHomeworkDto` accepts one `attachmentUrl`, not multiple attachments.
- No pending-homework endpoint for a student. Current student endpoint lists existing submissions only, so it cannot show assigned-but-not-submitted work.
- No e2e flow across upload, create homework, submit, grade, and gradebook.

### Existing Assessment, Rubric, and Learning Capability

Backend exists:

- Assessment setup, subjects, levels, questions, assessment assignment, attempts, responses.
- Attempt scoring fields: raw score, max score, percentage score, result status, teacher comments.
- Rubric and competency mastery services, including weighted rubric scoring and mastery updates.
- Homework can become `AssessmentEvidence` by `homeworkSubmissionId`.

Frontend exists:

- `/diagnostics` shows assessment attempts.
- `/lessons` lets admins author lessons/cards.
- `/learn` lets students take active learning lessons.

Gaps:

- No gradebook ledger or report-card abstraction.
- Assessment attempt results, homework grades, rubric scores, and manual marks are not normalized into one teacher-facing gradebook.
- No GPA, percentile, transcript, term report, or category weighting service.

### Existing Timetable Capability

Not present yet.

Gaps:

- No `Timetable` or `TimetableSlot` schema.
- No scheduling backend module.
- No conflict detection.
- No weekly grid UI.
- No teacher/student schedule view.

### Role and Navigation Constraints

Important current constraint:

- Routes inside `client/src/app/(dashboard)` map to top-level paths such as `/students` and `/classes`, but `client/src/app/(dashboard)/layout.tsx` currently allows only admin and super admin roles.
- Teachers cannot access future `/attendance`, `/homework`, `/timetable`, or `/gradebook` pages if those pages are placed under this layout without changing access logic.
- Students currently use `/learn`, and guardians may redirect to `/dashboard`, but the dashboard layout would reject non-admin users.

This phase should introduce role-aware academic workspace navigation instead of treating all operational academic pages as admin-only.

## Integration Principles

1. Reuse the existing academic graph.
   Timetable, attendance, homework, and gradebook should reference existing `AcademicYear`, `Term`, `ClassSection`, `CourseClass`, `StudentProfile`, `TeacherProfile`, and `User`.

2. Use source-of-truth records, then aggregate.
   Attendance rows, homework submissions, assessment attempts, and rubric assessments remain the raw records. Gradebook entries should be a normalized/materialized ledger derived from those records, not a replacement for them.

3. Keep daily screens fast and teacher-friendly.
   Attendance marking, homework grading, and grade entry should use bulk endpoints. Avoid one network call per student or per cell.

4. Make role access explicit.
   Admins configure structures. Teachers manage assigned classes. Students submit and view their own data. Guardians view linked students. The API should enforce scope, not only the UI.

5. Ship in vertical slices.
   Each milestone should deliver one usable workflow end to end: schema, backend, RTK endpoints, UI, tests, and seed data.

6. Prefer simple scheduling first.
   Start with recurring weekly slots by day/period/time. Do not attempt drag-and-drop auto-scheduling or optimization in this phase.

## Recommended Rollout Sequence

### Milestone 0: Academic Workspace Foundation

Purpose: unblock teacher/student academic pages and create shared client API types.

Backend tasks:

- Add missing permission subjects to seed data: `Timetable`, `Attendance`, `Homework`, `Gradebook`, `ReportCard`.
- Assign role permissions:
  - `ADMIN`: manage all academic workflows.
  - `TEACHER`: read timetable, manage attendance/homework/gradebook for assigned classes.
  - `USER` or future `STUDENT`: read own timetable, submit own homework, read own grades.
  - `GUARDIAN`: read linked student timetable, homework status, attendance, and report cards.
- Apply `RequirePermissions` gradually to new endpoints while preserving existing role guards where already used.

Frontend tasks:

- Add a role-aware academic shell decision:
  - Option A: broaden the existing dashboard layout to allow `TEACHER` and `GUARDIAN`, then hide/show nav groups by role.
  - Option B: create a separate academic workspace route group, such as `client/src/app/(academic)`, for teacher/student/guardian pages.
- Recommended: Option A for speed, with role-filtered sidebar items, because current operational routes already use the dashboard shell and shared header/sidebar.
- Add sidebar items:
  - Timetable -> `/timetable`
  - Attendance -> `/attendance`
  - Homework -> `/homework`
  - Gradebook -> `/gradebook`
  - Report Cards -> `/reports` or nested under Gradebook
- Extend `authApi` tag types with `Timetables`, `TimetableSlots`, `Attendance`, `AttendanceSummary`, `Homework`, `HomeworkSubmissions`, `Gradebook`, `ReportCards`.
- Split `dashboardApi.ts` if it becomes too large:
  - `academicApi.ts` for academic setup and timetable.
  - `attendanceApi.ts`
  - `homeworkApi.ts`
  - `gradebookApi.ts`
  Keep them all using `authApi.injectEndpoints`.

Acceptance criteria:

- Admin and teacher can enter academic operational pages.
- Students and guardians are routed to pages they can actually access.
- Sidebar and command search do not show inaccessible destinations.
- API permission subjects exist in seed data.

### Milestone 1: Timetable and Scheduling

Purpose: establish recurring weekly schedules and conflict-safe slot management.

#### Schema Design

Add enums:

```prisma
enum TimetableStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum TimetableSlotStatus {
  ACTIVE
  CANCELLED
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}
```

Add models:

```prisma
model Timetable {
  id             String          @id @default(uuid())
  academicYearId String
  termId         String?
  classSectionId String?
  name           String
  status         TimetableStatus @default(DRAFT)
  effectiveFrom  DateTime        @db.Date
  effectiveTo    DateTime?       @db.Date
  createdById    String?
  publishedAt    DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  academicYear   AcademicYear    @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  term           Term?           @relation(fields: [termId], references: [id], onDelete: SetNull)
  classSection   ClassSection?   @relation(fields: [classSectionId], references: [id], onDelete: Cascade)
  slots          TimetableSlot[]

  @@index([academicYearId, termId])
  @@index([classSectionId, status])
  @@map("timetables")
}

model TimetableSlot {
  id               String              @id @default(uuid())
  timetableId      String
  dayOfWeek        DayOfWeek
  periodIndex      Int
  startTimeMinutes Int
  endTimeMinutes   Int
  room             String?
  classSectionId   String
  courseClassId    String?
  teacherProfileId String?
  status           TimetableSlotStatus @default(ACTIVE)
  notes            String?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  timetable        Timetable           @relation(fields: [timetableId], references: [id], onDelete: Cascade)
  classSection     ClassSection        @relation(fields: [classSectionId], references: [id], onDelete: Cascade)
  courseClass      CourseClass?        @relation(fields: [courseClassId], references: [id], onDelete: SetNull)
  teacherProfile   TeacherProfile?     @relation(fields: [teacherProfileId], references: [id], onDelete: SetNull)

  @@index([dayOfWeek, startTimeMinutes, endTimeMinutes])
  @@index([teacherProfileId, dayOfWeek])
  @@index([classSectionId, dayOfWeek])
  @@index([room, dayOfWeek])
  @@map("timetable_slots")
}
```

Notes:

- Store time as minutes since midnight for conflict detection and timezone-safe recurring weekly slots.
- Keep `courseClassId` optional because homeroom/assembly/free-period slots may not map to a subject course.
- Store `classSectionId` on both `Timetable` and `TimetableSlot`; slot-level field makes future shared timetables possible and simplifies conflict checks.
- Do not store a concrete date per weekly slot in this phase.

#### Backend Module

Create:

- `services/api-service/src/timetable/timetable.module.ts`
- `services/api-service/src/timetable/timetable.controller.ts`
- `services/api-service/src/timetable/timetable.service.ts`
- `services/api-service/src/timetable/dto/timetable.dto.ts`
- `services/api-service/src/timetable/timetable-conflict.service.ts`
- `services/api-service/src/timetable/timetable.service.spec.ts`

Core APIs:

- `POST /timetables`
- `GET /timetables?academicYearId=&termId=&classSectionId=&teacherProfileId=&status=`
- `GET /timetables/:id`
- `PATCH /timetables/:id`
- `DELETE /timetables/:id`
- `POST /timetables/:id/publish`
- `POST /timetables/:id/slots`
- `PATCH /timetables/:id/slots/:slotId`
- `DELETE /timetables/:id/slots/:slotId`
- `POST /timetables/:id/slots:bulk-upsert`
- `POST /timetables/conflicts`
- `GET /timetables/schedule/student/:studentProfileId`
- `GET /timetables/schedule/teacher/:teacherProfileId`
- `GET /timetables/schedule/class-section/:classSectionId`

Conflict rules:

- Reject if `startTimeMinutes >= endTimeMinutes`.
- Reject if slot time is outside an optional school-day boundary, if configured later.
- Teacher conflict: same active teacher, same day, overlapping minutes, overlapping timetable effective date range.
- Class conflict: same active class section, same day, overlapping minutes, overlapping effective date range.
- Room conflict: same room, same day, overlapping minutes, overlapping effective date range.
- Course membership warning: if `courseClassId` is set, students enrolled in that course do not necessarily have to match the class section, but show a warning if enrollment is empty.
- Teacher-class authorization: teacher can create/update slots only for assigned class sections unless admin.

Conflict response shape:

```ts
type TimetableConflict = {
  type: "TEACHER" | "CLASS_SECTION" | "ROOM";
  message: string;
  conflictingSlotId: string;
  conflictingTimetableId: string;
  dayOfWeek: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
};
```

#### Frontend

Create:

- `client/src/features/academic/timetableApi.ts`
- `client/src/app/(dashboard)/timetable/page.tsx`
- `client/src/app/(dashboard)/timetable/components/weekly-timetable-grid.tsx`
- `client/src/app/(dashboard)/timetable/components/timetable-slot-dialog.tsx`
- `client/src/app/(dashboard)/timetable/components/schedule-filter-bar.tsx`

Weekly grid behavior:

- Columns: Monday through Friday by default, configurable to include Saturday/Sunday.
- Rows: periods derived from existing slots, with default period scaffold if empty.
- Filters: academic year, term, class section, teacher, status.
- Cell actions:
  - Empty cell: create slot.
  - Filled cell: edit/delete slot.
  - Conflict: red border and conflict summary.
- Publish action validates all slots and refuses publish if hard conflicts exist.
- Teacher view defaults to current teacher schedule.
- Student view derives schedule from active class placement plus course enrollments.

Acceptance criteria:

- Admin can create/publish a class timetable.
- Teacher cannot be double-booked.
- Room cannot be double-booked.
- Class section cannot have overlapping slots.
- Teacher can view assigned schedule.
- Student can view own weekly schedule.

### Milestone 2: Attendance System Overhaul

Purpose: make attendance a daily operational screen rather than a backend-only module.

#### Backend Enhancements

Keep existing `DailyAttendance`, `CourseClassSession`, and `CourseClassAttendance`.

Add service methods:

- `getClassDailySheet(classSectionId, date)`
  - Returns class roster plus existing attendance record per student.
  - Students with no attendance row default to `null` status for UI marking.
- `recordDailyAttendanceBulk`
  - Existing method is mostly sufficient. Tighten validation and include roster counts in response.
- `getClassAttendanceSummary(classSectionId, startDate, endDate)`
  - Returns totals, status breakdown, rate, per-day trend, per-student absence counts.
- `getMonthlyAttendanceSummary(month, academicYearId?, classSectionId?, studentProfileId?)`
  - Monthly dashboard stats.
- `getAbsenceTrends`
  - Group absences/late by date and class section.
- `getAtRiskAttendanceStudents`
  - Students below threshold, default 85 percent.

New APIs:

- `GET /attendance/daily/class-section/:classSectionId/sheet?date=YYYY-MM-DD`
- `POST /attendance/daily`
- `GET /attendance/reports/class-section/:classSectionId?startDate=&endDate=`
- `GET /attendance/reports/monthly?month=YYYY-MM&academicYearId=&classSectionId=`
- `GET /attendance/reports/absence-trends?startDate=&endDate=&classSectionId=`
- `GET /attendance/reports/at-risk?threshold=85&academicYearId=&classSectionId=`

Implementation notes:

- Reuse `AcademicService.getClassSectionRoster` logic or move reusable roster selection into a helper/service.
- Date-only fields should be normalized consistently. Use UTC date boundaries or direct `YYYY-MM-DD` date construction to avoid local timezone drift.
- Add indexes if reporting queries become slow:
  - `DailyAttendance(classSectionId, date)`
  - `DailyAttendance(studentProfileId, date)`
  - `CourseClassSession(courseClassId, date)`

#### Frontend

Create:

- `client/src/features/academic/attendanceApi.ts`
- `client/src/app/(dashboard)/attendance/page.tsx`
- `client/src/app/(dashboard)/attendance/components/attendance-toolbar.tsx`
- `client/src/app/(dashboard)/attendance/components/attendance-marking-grid.tsx`
- `client/src/app/(dashboard)/attendance/components/attendance-summary-panel.tsx`
- `client/src/app/(dashboard)/attendance/components/attendance-report-charts.tsx`

Dedicated `/attendance` page:

- Date picker.
- Class section selector.
- Optional mode: daily homeroom vs course session.
- Bulk actions:
  - Mark all present.
  - Mark unmarked absent.
  - Clear unsaved changes.
  - Save attendance.
- Per-student grid:
  - Student name.
  - Status segmented control: Present, Absent, Late, Excused.
  - Remarks input/popover.
  - Last saved timestamp/indicator.
- Summary panel:
  - Present count.
  - Absent count.
  - Late count.
  - Excused count.
  - Attendance rate.
  - Unmarked count.
- Reports tab:
  - Monthly line/bar chart.
  - Absence trend chart.
  - At-risk list.

Acceptance criteria:

- Teacher/admin can select date and class section, load roster, mark all students, and save in one request.
- Existing marks reload correctly on the same date.
- Summary updates optimistically before save and confirms after save.
- Monthly report reflects saved attendance rows.
- At-risk report identifies students below threshold.

### Milestone 3: Homework and Assignment System

Purpose: make homework usable by teachers and students, including files and grading.

#### Backend Enhancements

Schema options:

Option A: reuse URL arrays.

- Change `Homework.attachmentUrl` to `attachmentUrls String[] @default([])`.
- Use existing `HomeworkSubmission.attachmentUrls`.
- Fast and adequate for this phase.

Option B: add attachment join models to preserve file metadata.

```prisma
model HomeworkAttachment {
  homeworkId   String
  fileUploadId String
  createdAt    DateTime @default(now())

  homework     Homework   @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  fileUpload   FileUpload @relation(fields: [fileUploadId], references: [id], onDelete: Cascade)

  @@id([homeworkId, fileUploadId])
  @@map("homework_attachments")
}

model HomeworkSubmissionAttachment {
  submissionId String
  fileUploadId String
  createdAt    DateTime @default(now())

  submission   HomeworkSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  fileUpload   FileUpload         @relation(fields: [fileUploadId], references: [id], onDelete: Cascade)

  @@id([submissionId, fileUploadId])
  @@map("homework_submission_attachments")
}
```

Recommended: Option A now, Option B later if audit/security around files becomes important. The current `FileUploader` returns URL and the schema already has submission URL arrays.

DTO/service changes:

- `CreateHomeworkDto.attachmentUrls?: string[]`.
- `UpdateHomeworkDto.attachmentUrls?: string[]`.
- `SubmitHomeworkDto.content?: string`.
- `SubmitHomeworkDto.attachmentUrls?: string[]`.
- Require at least one of `content` or `attachmentUrls` for submission.
- Include `attachmentUrls` in homework create/update/submission upsert.
- On resubmission, reset grade fields as currently done.

New APIs:

- `GET /homework?courseClassId=&teacherProfileId=&status=&from=&to=`
- `GET /homework/:id`
- `GET /homework/:id/submissions`
- `GET /homework/me`
- `GET /homework/student/:studentProfileId/pending`
- `PATCH /homework/submissions/:id/grade`
- `POST /homework/submissions/:id/evidence`

Teacher scope:

- Admin can create homework for any course class.
- Teacher can create homework only for assigned class sections or taught course classes.
- If course-class-to-teacher relation is not explicit yet, use teacher's assigned class sections plus course class enrollment context for this phase, then add subject-teacher assignment later.

Student scope:

- Student can submit only homework for course classes where they are enrolled.
- Student can view only own homework/submissions.
- Guardian can view linked students only.

Gradebook integration:

- When a submission is graded, upsert a `GradeBookEntry` with source type `HOMEWORK_SUBMISSION`.
- If `POST /homework/submissions/:id/evidence` is used, record `AssessmentEvidence` for competency/rubric flows.

#### Frontend

Create:

- `client/src/features/academic/homeworkApi.ts`
- `client/src/app/(dashboard)/homework/page.tsx`
- `client/src/app/(dashboard)/homework/components/homework-create-dialog.tsx`
- `client/src/app/(dashboard)/homework/components/homework-list.tsx`
- `client/src/app/(dashboard)/homework/components/submissions-panel.tsx`
- `client/src/app/(dashboard)/homework/components/inline-grading-table.tsx`
- `client/src/app/(dashboard)/homework/components/student-homework-view.tsx`

Teacher `/homework` page:

- Course class selector.
- Homework list with due date, max points, attachment indicator, submission counts.
- Create/edit homework dialog:
  - title
  - description
  - due date/time
  - max points
  - file upload using existing `FileUploader`
- Submissions table:
  - student
  - status
  - submitted at
  - attachments
  - points input
  - feedback textarea
  - save grade
- Inline grading should autosave per row only after explicit save or debounce with visible status.

Student homework view:

- For regular students, `/homework` should show:
  - pending homework
  - due soon
  - submitted
  - graded
- Submission form:
  - content textarea
  - file upload
  - submit/resubmit
- Grades and feedback display:
  - points earned/max points
  - status
  - feedback
  - graded date

Acceptance criteria:

- Teacher creates homework with one or more attachments.
- Student sees pending homework even before submitting.
- Student submits text, file, or both.
- Teacher grades submission inline with feedback.
- Grade creates/updates gradebook source entry.

### Milestone 4: Gradebook

Purpose: unify homework, assessment attempts, rubric assessments, and manual marks into teacher gradebook and student transcript views.

#### Schema Design

Add enums:

```prisma
enum GradeSourceType {
  HOMEWORK_SUBMISSION
  ASSESSMENT_ATTEMPT
  RUBRIC_ASSESSMENT
  MANUAL
}

enum GradeBookEntryStatus {
  DRAFT
  PUBLISHED
  EXCLUDED
}
```

Add model:

```prisma
model GradeBookEntry {
  id               String               @id @default(uuid())
  studentProfileId String
  classSectionId   String?
  courseClassId    String?
  termId           String?
  sourceType       GradeSourceType
  sourceId         String?
  title            String
  category         String               @default("GENERAL")
  pointsEarned     Float?
  pointsPossible   Float?
  percentage       Float?
  weight           Float                @default(1.0)
  status           GradeBookEntryStatus @default(DRAFT)
  assessedAt       DateTime?
  publishedAt      DateTime?
  notes            String?
  createdById      String?
  updatedById      String?
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  studentProfile   StudentProfile       @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  classSection     ClassSection?        @relation(fields: [classSectionId], references: [id], onDelete: SetNull)
  courseClass      CourseClass?         @relation(fields: [courseClassId], references: [id], onDelete: SetNull)
  term             Term?                @relation(fields: [termId], references: [id], onDelete: SetNull)

  @@unique([studentProfileId, sourceType, sourceId])
  @@index([courseClassId, termId])
  @@index([classSectionId, termId])
  @@index([studentProfileId, termId])
  @@map("gradebook_entries")
}
```

Optional later model:

```prisma
model GradeCategoryWeight {
  id             String   @id @default(uuid())
  courseClassId  String?
  classSectionId String?
  termId         String?
  category       String
  weight         Float
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([courseClassId, classSectionId, termId, category])
  @@map("grade_category_weights")
}
```

Recommended first version:

- Add `GradeBookEntry`.
- Use category-level weights configured in code/default settings first.
- Add `GradeCategoryWeight` only if the UI requires configurable grading schemes in this phase.

#### Backend Module

Create:

- `services/api-service/src/gradebook/gradebook.module.ts`
- `services/api-service/src/gradebook/gradebook.controller.ts`
- `services/api-service/src/gradebook/gradebook.service.ts`
- `services/api-service/src/gradebook/grade-calculation.service.ts`
- `services/api-service/src/gradebook/dto/gradebook.dto.ts`
- `services/api-service/src/gradebook/grade-calculation.service.spec.ts`

Core APIs:

- `GET /gradebook/course-class/:courseClassId?termId=`
- `GET /gradebook/class-section/:classSectionId?termId=`
- `GET /gradebook/student/:studentProfileId?termId=`
- `POST /gradebook/manual-entry`
- `PATCH /gradebook/entries/:id`
- `POST /gradebook/entries:bulk-upsert`
- `POST /gradebook/sync`
- `GET /gradebook/report-card/student/:studentProfileId?termId=`
- `GET /gradebook/transcript/student/:studentProfileId`

Grade calculation rules:

- Percentage: `pointsEarned / pointsPossible * 100`.
- Weighted average:
  - Group entries by category.
  - Drop excluded entries.
  - For each category, average percentages weighted by entry weight.
  - Apply category weights.
  - Normalize if some categories have no entries.
- GPA:
  - Use a configurable scale. Start with simple 4.0 mapping:
    - 90-100: 4.0
    - 80-89: 3.0
    - 70-79: 2.0
    - 60-69: 1.0
    - below 60: 0.0
- Percentile:
  - Compute within course class or class section for same term.
  - Use rank among students with at least one published entry.
- Publish model:
  - Teachers can keep entries as draft while grading.
  - Student transcript/report card uses published entries only unless admin requests draft preview.

Sync events:

- On homework grade, upsert `HOMEWORK_SUBMISSION`.
- On assessment attempt mark/submit, upsert `ASSESSMENT_ATTEMPT`.
- On rubric assessment creation, optionally upsert `RUBRIC_ASSESSMENT`.
- Manual entries are created directly through gradebook UI.
- Add `POST /gradebook/sync` for backfill after migration.

#### Frontend

Create:

- `client/src/features/academic/gradebookApi.ts`
- `client/src/app/(dashboard)/gradebook/page.tsx`
- `client/src/app/(dashboard)/gradebook/components/gradebook-toolbar.tsx`
- `client/src/app/(dashboard)/gradebook/components/gradebook-grid.tsx`
- `client/src/app/(dashboard)/gradebook/components/grade-entry-cell.tsx`
- `client/src/app/(dashboard)/gradebook/components/student-report-card.tsx`
- `client/src/app/(dashboard)/gradebook/components/transcript-view.tsx`

Teacher gradebook:

- Filters:
  - term
  - course class
  - class section
  - category
  - draft/published
- Spreadsheet grid:
  - rows: students
  - columns: grade sources/assignments
  - frozen student identity column
  - editable manual cells
  - read-only derived cells from homework/assessment unless opening source
  - final average and letter/GPA columns
- Bulk actions:
  - publish selected columns
  - export CSV
  - sync source grades

Student transcript/report card:

- Current term summary.
- Category breakdown.
- Assessment/homework detail table.
- Attendance summary panel, read-only.
- Teacher feedback and published report card state.

Acceptance criteria:

- Grading homework creates gradebook entries.
- Marked assessment attempts can be synced into gradebook.
- Teacher can add manual marks.
- Teacher can view weighted course/class average.
- Student can view published report card/transcript.

### Milestone 5: Cross-Workflow Reporting

Purpose: connect attendance, homework, grades, and timetable into a daily school operating view.

Admin dashboard additions:

- Today's timetable occupancy:
  - scheduled slots
  - teacher conflicts
  - free rooms if room data exists
- Attendance snapshot:
  - classes marked
  - unmarked classes
  - absence count
- Homework snapshot:
  - due today
  - overdue ungraded submissions
- Gradebook snapshot:
  - grading backlog
  - report cards ready to publish

Teacher dashboard additions:

- Today's teaching schedule.
- Attendance tasks for assigned classes.
- Homework submissions awaiting grading.
- Gradebook changes since last login.

Student dashboard additions:

- Today's schedule.
- Pending homework.
- Recent feedback.
- Attendance status if allowed.

Guardian dashboard additions:

- Linked student schedule.
- Attendance alerts.
- Homework due/overdue.
- Published report cards.

## Detailed API Integration Map

### Existing endpoints to keep and reuse

- Academic setup:
  - `/academic-years`
  - `/terms`
  - `/class-sections`
  - `/class-sections/:id/roster`
  - `/course-classes`
- Students:
  - `/student-profiles`
  - `/student-placements`
  - `/student-enrollments`
- Teachers:
  - `/teacher-profiles`
  - `/teacher-profiles/:id/classes`
- Uploads:
  - `/uploads`
- Assessments:
  - `/assessments`
  - `/assignments`
  - `/attempts`
  - `/responses`
- Homework:
  - existing routes should be extended, not replaced.
- Attendance:
  - existing routes should be extended, not replaced.

### New endpoint groups

- `/timetables`
- `/attendance/reports/*`
- `/homework/me`
- `/homework/student/:id/pending`
- `/gradebook/*`
- `/reports/*` if report cards become separate from gradebook.

## Frontend Information Architecture

Recommended navigation after phase:

Academics:

- Overview
- Timetable
- Attendance
- Homework
- Gradebook
- Diagnostics
- Lesson Authoring
- Active Learning

Management:

- Leads and Enrolments
- Student Roster
- Teachers
- Classes
- Campuses and Programs
- Users and Roles

Operations:

- Communication
- Billing and Plans

Role visibility:

- Admin: all.
- Teacher: Timetable, Attendance, Homework, Gradebook, Diagnostics, Lessons where permitted, own schedule.
- Student: Active Learning, Homework, Timetable, Grades/Transcript.
- Guardian: linked student Homework, Timetable, Attendance summary, Grades/Report Cards.

## Data Flow by Daily Workflow

### Teacher Takes Attendance

1. Teacher opens `/attendance`.
2. UI resolves current teacher profile from `/teacher-profiles/me`.
3. UI loads assigned class sections.
4. Teacher selects date and class section.
5. UI calls `/attendance/daily/class-section/:id/sheet`.
6. UI renders roster plus existing attendance rows.
7. Teacher marks statuses in grid.
8. UI submits one `POST /attendance/daily` payload.
9. API upserts all records in a transaction.
10. UI refreshes summary and reports tags.

### Teacher Creates and Grades Homework

1. Teacher opens `/homework`.
2. UI loads course classes in teacher scope.
3. Teacher creates homework, optionally uploading files first through `/uploads`.
4. API creates homework with attachment URLs and recorded creator.
5. Students see homework through `/homework/me`.
6. Student uploads files, submits content/attachments.
7. Teacher opens submissions panel and grades inline.
8. API updates submission and upserts gradebook entry.
9. Student sees grade/feedback after publish or immediately if homework policy allows.

### Gradebook Sync

1. Homework grading calls `gradebookService.upsertFromHomeworkSubmission`.
2. Assessment attempt marking calls `gradebookService.upsertFromAssessmentAttempt`.
3. Rubric scoring can call `gradebookService.upsertFromRubricAssessment`.
4. Manual grade entries are edited directly in `/gradebook`.
5. Report-card API calculates weighted average, GPA, percentile, and category breakdown from published entries.

### Timetable to Attendance Link

1. Timetable defines expected weekly slots.
2. Attendance page can default to today's class/teacher slots.
3. Course sessions can be generated manually from timetable slots or lazily when attendance is taken.
4. Later phase can add "generate sessions from timetable for date range".

## Testing Strategy

### Backend unit tests

Add tests for:

- `TimetableConflictService`
  - teacher overlap
  - class-section overlap
  - room overlap
  - non-overlap adjacent slots
  - archived/cancelled slots ignored
- `AttendanceService`
  - class daily sheet includes unmarked students
  - bulk save upserts rows
  - summary calculates breakdown and rate
  - absence trend grouping
- `HomeworkService`
  - attachment URLs accepted on create/submit
  - content or attachment required
  - pending homework list excludes completed submissions or marks status correctly
  - grading upserts gradebook entry
- `GradeCalculationService`
  - percentage calculation
  - weighted category average
  - missing category normalization
  - GPA scale mapping
  - percentile ranking

### Backend e2e tests

Extend `education-os.e2e-spec.ts` or create focused files:

- `timetable.e2e-spec.ts`
  - create academic setup
  - create timetable
  - add slots
  - verify conflicts return 400
  - publish timetable
  - load teacher/student schedules
- `attendance.e2e-spec.ts`
  - create roster
  - get sheet
  - record attendance
  - reload sheet
  - get monthly summary
- `homework-gradebook.e2e-spec.ts`
  - create homework
  - upload or fake attachment URL
  - submit as student
  - grade as teacher/admin
  - verify gradebook entry and student report card

### Frontend checks

Minimum:

- Typecheck client.
- Lint client.
- Build client.
- Manual browser verification:
  - attendance grid desktop and mobile
  - timetable weekly grid desktop and mobile
  - homework create/submit/grade
  - gradebook grid horizontal scroll and cell editing

If adding frontend tests later:

- Add component tests for pure calculation/display components.
- Add Playwright smoke tests for route load and critical forms.

## Migration and Seed Strategy

Migration order:

1. Add timetable and gradebook enums/models.
2. Add homework attachment DTO/service changes. If changing `Homework.attachmentUrl` to `attachmentUrls`, migrate existing single URL to one-element array.
3. Add indexes for attendance reports.
4. Generate Prisma client.
5. Add seed data:
   - timetable for seeded class section
   - homework with attachments
   - submissions and graded examples
   - gradebook entries
   - extra permissions

Seed should support demo pages:

- A published weekly timetable.
- One class with attendance for multiple dates.
- Pending, submitted, late, and graded homework examples.
- Gradebook entries across homework and assessment sources.

## Risk Register

### Risk: role layout blocks teachers/students

Impact: teacher pages exist but cannot be accessed.

Mitigation: Milestone 0 must happen first. Add role-aware sidebar and layout access before adding operational pages.

### Risk: timetable conflict detection becomes too broad

Impact: valid schedules blocked, especially across terms or archived timetables.

Mitigation: conflict queries must filter active/published status and overlapping effective date ranges.

### Risk: date handling drifts by timezone

Impact: attendance/timetable data appears on the wrong day.

Mitigation: use `YYYY-MM-DD` date-only parsing conventions for attendance and store recurring timetable time as minutes since midnight.

### Risk: gradebook duplicates source marks

Impact: homework or assessment edits create stale grades.

Mitigation: unique key on `(studentProfileId, sourceType, sourceId)`, and every source update performs upsert instead of create.

### Risk: dashboardApi becomes too large

Impact: slow development and merge conflicts.

Mitigation: introduce academic-specific injected RTK API files.

### Risk: file uploads are only URL-based

Impact: no robust permission/audit relationship between uploaded files and homework.

Mitigation: use URL arrays for this phase, but keep a clear path to join models if file audit becomes required.

## Implementation Order

1. Milestone 0: role-aware academic workspace and API tag/type organization.
2. Milestone 1 backend: timetable schema, service, conflict tests, controller.
3. Milestone 1 frontend: timetable RTK endpoints and weekly grid.
4. Milestone 2 backend: attendance sheet/report APIs and tests.
5. Milestone 2 frontend: `/attendance` page and charts.
6. Milestone 3 backend: homework attachments, pending endpoint, gradebook hook point.
7. Milestone 3 frontend: `/homework` teacher and student views.
8. Milestone 4 backend: gradebook schema/service/calculations/sync.
9. Milestone 4 frontend: `/gradebook` spreadsheet and student report card.
10. Milestone 5 dashboards, seed polish, e2e coverage, docs.

## Definition of Done for the Phase

- Timetable can be created, conflict-checked, published, and viewed by class, teacher, and student.
- Attendance can be taken daily from a roster grid, saved in bulk, and reported monthly.
- Homework can be created with attachments, submitted by students with files, graded inline by teachers, and viewed with feedback.
- Gradebook aggregates homework, assessment attempts, rubric scores, and manual entries.
- Student report card/transcript shows published grades and attendance summary.
- Role access works for admin, teacher, student, and guardian paths.
- Seed data demonstrates every workflow.
- Backend unit and e2e tests cover critical paths.
- Client typecheck, lint, and build pass.

