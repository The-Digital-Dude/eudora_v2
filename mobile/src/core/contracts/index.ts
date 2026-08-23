/**
 * Hand-written mirrors of the api-service response shapes.
 *
 * The backend now serves OpenAPI at `/api/docs-json` (see api-service
 * `main.ts`), but it carries exactly one @nestjs/swagger decorator, so the
 * generated document describes routes and says nothing useful about response
 * bodies. `generated/openapi.d.ts` is therefore stale, imported by nothing, and
 * not the source of truth — this file is. Regenerating it only becomes
 * worthwhile once the API's DTOs are actually annotated.
 *
 * Because these are hand-written, `tsc` cannot tell you when they drift from
 * the API. It passed clean while four of the types below described endpoints
 * that no longer existed. Treat a green typecheck here as proof of internal
 * consistency only, never of contract accuracy.
 *
 * Nothing here may import React or react-native: `core` is deliberately
 * platform-free so it can be lifted into a shared package for the TV target.
 */

// ─── Envelope ────────────────────────────────────────────────────────────────

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  version: string;
  path: string;
  method: string;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  code: string;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  code: string;
  message: string;
  errors?: { field?: string; code: string; message: string }[];
  meta: ApiMeta;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Mirrors CurrentUserDto (services/api-service/src/auth/dto/current-user.dto.ts)
 * exactly — `roles` is a flat string array, already flattened server-side from
 * the `UserRole -> Role` relation; it is not `{ role: { name } }[]`.
 *
 * `studentProfile`/`guardianProfile` presence (not `roles`) is the routing
 * signal for role-aware screens — a user can hold both the GUARDIAN role and
 * a student profile (the schema allows it, even if no seeded account does
 * today), so branch on "do they have guardian data to show" rather than on
 * role membership alone.
 */
export interface AuthUserStudentProfile {
  id: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export interface AuthUserGuardianProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: { action: string; subject: string }[];
  studentProfile: AuthUserStudentProfile | null;
  guardianProfile: AuthUserGuardianProfile | null;
}

export interface UpdateMyStudentProfilePayload {
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface UpdateGuardianProfilePayload {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface RegisterDeviceTokenPayload {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

/** Response of the native token endpoints added in Phase 0. */
export interface TokenResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

/**
 * `HOMEWORK` and `LIVE_CLASS` landed in the API on 2026-08-17/20 and were
 * missing here, which mattered more than a missing union member usually does:
 * the item screen's fallthrough sent both kinds to `AssessmentItemView`, so
 * they rendered as a broken assessment rather than failing loudly.
 *
 * A `HOMEWORK` item is the *slot*; its brief comes from
 * `GET /catalog/module-items/:id/my-homework`. A `LIVE_CLASS` item resolves to
 * a different meeting per cohort, so its date and join link come from
 * `GET /catalog/module-items/:id/my-session`, not from the item.
 */
export type ModuleItemKind =
  | 'VIDEO'
  | 'READING'
  | 'DISCUSSION'
  | 'ASSESSMENT'
  | 'HOMEWORK'
  | 'LIVE_CLASS';
export type CatalogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface LearningSubject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface ModuleItem {
  id: string;
  conceptId: string;
  kind: ModuleItemKind;
  title: string;
  sortOrder: number;
  status: CatalogStatus;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  readingContent: string | null;
  assessmentId: string | null;
  /**
   * Ungated even for signed-out visitors. Distinguishing this from "locked"
   * is what lets the outline say *why* an item will not open — without it a
   * paywalled item is indistinguishable from an empty one.
   */
  isFreePreview: boolean;
  /**
   * Server-computed as `!(entitled || isFreePreview)`.
   *
   * When true the API deliberately nulls `videoUrl`, `readingContent` and
   * `assessmentId` while still returning the row — the learner is meant to see
   * that the item exists and be told to unlock it. Mobile has been receiving
   * this and ignoring it, so paywalled items render as blank ones. Wiring it up
   * is W6; having it in the contract is W1's job.
   */
  isContentLocked: boolean;
  isDone: boolean;
}

export interface CourseLesson {
  id: string;
  title: string;
  sortOrder: number;
  xpReward: number;
}

export interface CourseConcept {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  kind: 'CHAPTER' | 'CHECKPOINT';
  passThresholdPercent: number | null;
  lessons: CourseLesson[];
  items: ModuleItem[];
  /** Server-computed; a concept is done once every lesson under it is done. */
  isDone: boolean;
  /** Server-computed; chapters unlock strictly in sortOrder. */
  isLocked: boolean;
}

export interface CourseSummary {
  id: string;
  learningSubjectId: string;
  title: string;
  slug: string;
  description: string | null;
  estimatedHours: number | null;
  status: CatalogStatus;
  sortOrder: number;
  gradeBand: 'PRE_K_K' | 'G1_2' | 'G3_4' | 'G5_6' | null;
  /**
   * Whether a guardian (or staff) put this course in the student's learning
   * plan. Only present for student callers; a recommendation, not an access
   * gate — every listed course is openable either way.
   */
  isAssigned?: boolean;
  learningSubject: { id: string; name: string; code: string };
  _count: { concepts: number };
}

export interface CourseDetail extends Omit<CourseSummary, '_count'> {
  concepts: CourseConcept[];
}

export interface UpdateModuleItemProgressPayload {
  completed?: boolean;
  lastPositionSeconds?: number;
  notes?: string;
}

export interface DiscussionPost {
  id: string;
  discussionThreadId: string;
  studentProfileId: string;
  parentPostId: string | null;
  body: string;
  createdAt: string;
  studentProfile: { id: string; fullName: string };
}

export interface DiscussionThread {
  id: string;
  moduleItemId: string;
  prompt: string;
  createdAt: string;
  posts: DiscussionPost[];
}

// ─── Lessons / Cards ─────────────────────────────────────────────────────────

export type CardType = 'CONCEPTUAL' | 'INTERACTIVE' | 'CHECKPOINT';

export type WidgetType =
  | 'STANDARD_MCQ'
  | 'SLIDER_MANIPULATIVE'
  | 'DRAG_AND_DROP_LABELS'
  | 'COORDINATE_PLOTTER'
  | 'GRID_MATCHING'
  | 'CODE_PLAYGROUND'
  | 'SHAPE_SHADING';

export interface QuestionOption {
  id: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

export interface CardQuestion {
  id: string;
  prompt: string;
  questionType: string;
  widgetType: WidgetType | null;
  /** Regenerated per attempt from a deterministic seed; never trust locally. */
  widgetConfig: Record<string, any> | null;
  explanation: string | null;
  hints: string[];
  correctAnswer: string | null;
  options: QuestionOption[];
}

export interface LessonCard {
  id: string;
  lessonId: string;
  title: string;
  sortOrder: number;
  cardType: CardType;
  content: string;
  question: CardQuestion | null;
}

export interface LessonAttempt {
  id: string;
  lessonId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  xpEarned: number;
  cardResponses: { cardId: string; isCorrect: boolean }[];
}

export interface LessonFlow {
  lesson: {
    id: string;
    conceptId: string;
    title: string;
    description: string | null;
    xpReward: number;
    cards: LessonCard[];
  };
  attempt: LessonAttempt;
}

export interface SubmitCardPayload {
  timeSpentSeconds: number;
  interactionState?: Record<string, any>;
  selectedOptionId?: string;
  responseText?: string;
}

export interface SubmitCardResult {
  isCorrect: boolean;
  explanation: string;
  xpEarned: number;
  isLessonComplete: boolean;
  /** Only sent on an incorrect submission — never alongside a correct one. */
  correctReveal?: { correctValue?: number };
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface GamificationMe {
  experience: { totalXp: number; level: number; nextLevelXp: number };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
  };
  lessonsCompleted: number;
}

export interface DailyGoal {
  key: 'items' | 'videos' | 'readings';
  label: string;
  target: number;
  progress: number;
}

export interface TodaysGoals {
  goals: DailyGoal[];
}

export interface GamificationBadge {
  code: string;
  name: string;
  description: string;
  earned: boolean;
  progress: number;
  maxProgress: number;
}

export interface LeaderboardEntry {
  studentProfileId: string;
  fullName: string;
  totalXp: number;
  level: number;
  rank: number;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

// ─── Assessments ─────────────────────────────────────────────────────────────

export interface MyAssignmentForItem {
  id: string;
  status: string;
  dueAt: string;
}

export interface AssignmentAssessmentSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  totalMarks: number;
  estimatedDurationMinutes: number | null;
  countsTowardGrade: boolean;
  maxAttempts: number | null;
}

export interface Assignment {
  id: string;
  assessmentId: string;
  studentProfileId: string;
  classSectionId: string;
  status: string;
  dueAt: string;
  assessment: AssignmentAssessmentSummary;
}

/**
 * Answer-key-free question shape — mirrors `CardQuestion` for `WidgetSelector`
 * compatibility, but has no `correctAnswer`/`option.isCorrect`: the backend
 * withholds both until the attempt is submitted and graded.
 */
export interface AttemptQuestionQuestion {
  id: string;
  questionType: string;
  prompt: string;
  widgetType: WidgetType | null;
  widgetConfig: Record<string, any> | null;
  hints: string[];
  options: { id: string; optionLabel: string; optionText: string }[];
}

export interface AttemptQuestion {
  id: string;
  sectionId: string;
  questionNumber: number;
  marksAvailable: number;
  section: { id: string; title: string; sortOrder: number };
  question: AttemptQuestionQuestion;
}

export interface AttemptResponse {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  responseText: string | null;
  interactionState: Record<string, any> | null;
  isCorrect: boolean | null;
  marksAwarded: number | null;
  marksAvailable: number;
  timeSpentSeconds: number;
  feedback: string | null;
}

export interface AssessmentAttempt {
  id: string;
  assessmentAssignmentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  rawScore: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  resultStatus: 'in_progress' | 'submitted' | 'marked' | 'needs_review';
  responses: AttemptResponse[];
}

export interface StartAttemptPayload {
  assessmentAssignmentId: string;
}

export interface SaveResponsePayload {
  assessmentAttemptId: string;
  questionId: string;
  selectedOptionId?: string;
  responseText?: string;
  interactionState?: Record<string, any>;
  timeSpentSeconds?: number;
}

// ─── Guardian / Parent ───────────────────────────────────────────────────────

export interface ChildClassSection {
  id: string;
  name: string;
  code: string;
}

export interface ChildLatestGrade {
  title: string;
  percentage: number | null;
  pointsEarned: number | null;
  pointsPossible: number | null;
  assessedAt: string;
}

/** `GET /parent/children` — one row per linked student. */
export interface ChildSummary {
  studentProfileId: string;
  fullName: string;
  birthDate: string;
  gender: string;
  classSection: ChildClassSection | null;
  attendanceRate: number;
  pendingHomeworkCount: number;
  latestGrade: ChildLatestGrade | null;
}

/** `GET /parent/children/:id/learning` — Eudora's own active-learning stats, not the legacy gradebook. */
export interface ChildLearningSummary {
  lessonsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  level: number;
  mastery: { competencyName: string; masteryScore: number; status: string }[];
}

/** `GET /parent/children/:id/teachers` */
export interface ChildTeacher {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  specialization: string | null;
}

/** `GET /parent/children/:id/attendance` */
export interface ChildAttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | string;
  remarks: string | null;
  classSection: { name: string };
}

/** `GET /parent/children/:id/homework` */
export interface ChildHomeworkItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  pointsPossible: number | null;
  courseName: string;
  submission: {
    id: string;
    status: string;
    submissionDate: string | null;
    feedback: string | null;
  } | null;
}

/** `GET /parent/billing/invoices` — `amount` is a Prisma Decimal, serialized as a string. */
export interface FamilyInvoice {
  id: string;
  amount: string;
  currency: string;
  description: string | null;
  issueDate: string;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | string;
}

/** `GET /parent/billing/payments` */
export interface FamilyPayment {
  id: string;
  invoiceId: string | null;
  amount: string;
  currency: string;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

export interface CreateGuardianProfilePayload {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface SelfLinkStudentPayload {
  studentEmail: string;
  relationshipType?: string;
}

/** `GET /parent/children/:id/grades` */
export interface ChildGradeEntry {
  id: string;
  title: string;
  category: string;
  pointsEarned: number | null;
  pointsPossible: number | null;
  percentage: number | null;
  status: string;
  assessedAt: string | null;
  batch: { name: string } | null;
  term: { name: string } | null;
}

// ─── Messaging — DEAD ────────────────────────────────────────────────────────
//
// The API's messaging module was deleted outright on 2026-08-16
// (`20260816070000_remove_message_center`). There is no `/messages/*` route to
// repoint at and no replacement endpoint. Everything below describes nothing.
//
// Left in place, unrenamed, so that W3 deletes it together with
// `src/features/messaging/` and `app/messages/*` rather than this file quietly
// keeping the feature alive. Do not "fix" these types.

export interface MessageSender {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface MessageItem {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  attachmentUrls: string[];
  readAt: string | null;
  createdAt: string;
  sender?: MessageSender;
}

export interface MessageThread {
  id: string;
  subject: string;
  status: string;
  lastMessageAt: string;
  studentProfile: { id: string; fullName: string } | null;
  guardian: MessageSender;
  teacher: MessageSender;
  /** `getThreads` includes only the latest message; `getThread` includes the full history. */
  messages: MessageItem[];
  unreadCount?: number;
}

export interface CreateThreadPayload {
  subject: string;
  studentProfileId?: string;
  teacherUserId: string;
  firstMessageBody: string;
}

export interface CreateMessagePayload {
  body: string;
  attachmentUrls?: string[];
}

// ─── Homework (student self-service — `/homework/*`'s student-facing routes
// are @Roles('USER', 'GUARDIAN', ...) too, unlike messaging) ────────────────

/**
 * Homework became a *course checkpoint* on 2026-08-20, which loosened two
 * fields that used to be guaranteed:
 *
 * - `batch` is null for a self-paced learner, who has no cohort at all.
 * - `dueDate` is null for the same reason — a self-paced checkpoint is worked
 *   through whenever the learner reaches it. Formatting it unconditionally
 *   renders "Invalid Date".
 *
 * `attachmentUrls` here is the *brief's* files, attached by the teacher who set
 * the work. It is unrelated to the learner's handed-in files, which are private
 * and never exposed as URLs — see `SubmitHomeworkPayload`.
 */
export interface PendingHomeworkItem {
  id: string;
  /** Set when this is a course checkpoint; null for standalone cohort homework. */
  moduleItemId: string | null;
  batchId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxPoints: number;
  attachmentUrls: string[];
  batch: { id: string; name: string } | null;
}

/** One handed-in file, as returned by `POST /homework/attachments`. */
export interface HomeworkAttachmentUpload {
  id: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export interface HomeworkSubmissionRecord {
  id: string;
  homeworkId: string;
  submissionDate: string;
  content: string | null;
  status: string;
  pointsEarned: number | null;
  feedback: string | null;
  /**
   * Present only on the `POST /homework/submit` response. The list read
   * (`GET /homework/student/:id`) does not include attachments at all, so this
   * is optional rather than a lie in one of the two directions.
   *
   * Files are served through `GET /homework/attachments/:fileId` with the
   * caller's bearer token — they are private, and there is no public URL to
   * hand to an `<Image>`.
   */
  attachments?: {
    fileUploadId: string;
    sortOrder: number;
    file: { originalName: string; size: number; mimetype: string };
  }[];
  homework: {
    title: string;
    maxPoints: number;
    dueDate: string | null;
    batch: { name: string } | null;
  };
}

export interface SubmitHomeworkPayload {
  homeworkId: string;
  content?: string;
  /**
   * Ids from `POST /homework/attachments`, never URLs. The old `attachmentUrls`
   * field let the caller say where a learner's work lived; the API dropped it,
   * and because the field is simply ignored rather than rejected, sending it
   * lost the attachments behind a successful 201.
   */
  attachmentFileIds?: string[];
}

// ─── Timetable — DEAD ────────────────────────────────────────────────────────
//
// Retired on 2026-08-21 (`20260821120000_retire_timetable`). `TimetableSlot`
// was a weekly recurrence rule; the API now materialises real meetings as
// `BatchSession` and reads them through `GET /api/schedule/student/:id`, which
// is a different shape — no `periodIndex`, no `room`, actual start/end
// timestamps.
//
// `courseClass` below is deliberately NOT renamed to `batch`: renaming a field
// on a deleted endpoint would only make the type look maintained. W3 deletes
// this alongside `app/timetable.tsx` and `src/features/timetable/`. Bringing
// back a "today's sessions" screen off the new endpoint is a new feature, and
// gets a new type.

export interface TimetableSlot {
  id: string;
  dayOfWeek: string;
  periodIndex: number;
  startTimeMinutes: number;
  endTimeMinutes: number;
  room: string | null;
  courseClass: { id: string; name: string } | null;
  teacherProfile: { id: string; fullName: string } | null;
}

// ─── Assessment list/history (`GET /students/:id/assignments`,
// `GET /students/:id/attempts`) — browsing, distinct from the existing
// deep-link-by-id attempt player in assessmentApi.ts ──────────────────────

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssignmentSummary {
  id: string;
  assessmentId: string;
  studentProfileId: string;
  classSectionId: string | null;
  opensAt: string | null;
  dueAt: string | null;
  status: string;
  assessment: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    totalMarks: number;
    estimatedDurationMinutes: number | null;
    countsTowardGrade: boolean;
    maxAttempts: number;
  };
  classSection: { id: string; code: string; name: string } | null;
}

export interface AttemptSummary {
  id: string;
  assessmentAssignmentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  rawScore: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  resultStatus: string;
}

/** `GET /gradebook/student/:id/summary` */
export interface GradebookSummary {
  categoryAverages: Record<string, number>;
  termAverage: number | null;
  gpa: number | null;
  letterGrade: string;
  classRank: number | null;
  classPercentile: number | null;
}

/** `POST /auth/device/approve` — approving a TV pairing code from the phone. */
export interface ApproveDevicePairingResponse {
  approved: true;
}
