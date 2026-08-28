import { authApi } from "../auth/authApi";
import type { DeliveryMode } from "../dashboard/dashboardApi";

export interface MyLiveSession {
  id: string;
  batchId: string;
  moduleItemId: string | null;
  topic: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  provider: "NONE" | "ZOOM";
  joinUrl: string | null;
  cancelledAt: string | null;
  batch?: { id: string; name: string; code: string };
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

/** Why there is no session to show, when `session` is null. */
export type MyLiveSessionReason =
  | "NOT_A_STUDENT"
  | "NOT_IN_A_BATCH"
  | "NOT_SCHEDULED";

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface LearningSubject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  status: string;
}

export type ModuleItemKind =
  | "VIDEO"
  | "READING"
  | "DISCUSSION"
  | "ASSESSMENT"
  /** Curriculum slot for a live session; the meeting itself is a BatchSession. */
  | "LIVE_CLASS"
  /** Work handed in for a person to read; the brief is a Homework row. */
  | "HOMEWORK";

export interface ModuleItem {
  id: string;
  conceptId: string;
  kind: ModuleItemKind;
  title: string;
  sortOrder: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  /** Null when the content is entitlement-locked — the server withholds the
   * body but still returns the row so the outline stays visible. */
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  readingContent: string | null;
  assessmentId: string | null;
  isFreePreview: boolean;
  /** True when this item's body was withheld for lack of an entitlement. */
  isContentLocked: boolean;
  isDone: boolean;
}

export interface CourseConcept {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  kind: "CHAPTER" | "CHECKPOINT";
  passThresholdPercent: number | null;
  lessons: { id: string; title: string; sortOrder: number; xpReward: number }[];
  items: ModuleItem[];
  isDone: boolean;
  isLocked: boolean;
}

export interface CreateModuleItemPayload {
  conceptId: string;
  kind: ModuleItemKind;
  title: string;
  sortOrder?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  videoUrl?: string;
  videoDurationSeconds?: number;
  readingContent?: string;
  assessmentId?: string;
  discussionPrompt?: string;
  homeworkInstructions?: string;
  homeworkMaxPoints?: number;
  /** Omitted for a self-paced checkpoint, which has no deadline. */
  homeworkDueDate?: string;
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
  posts: DiscussionPost[];
}

export type GradeBand = "PRE_K_K" | "G1_2" | "G3_4" | "G5_6";

export interface CourseSummary {
  id: string;
  learningSubjectId: string;
  title: string;
  slug: string;
  description: string | null;
  estimatedHours: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  durationWeeks: number | null;
  thumbnailUrl: string | null;
  gradeBand: GradeBand | null;
  deliveryMode: DeliveryMode;
  priceOneTimeCents: number | null;
  priceMonthlyCents: number | null;
  installmentCount: number | null;
  currency: string;
  learningSubject: { id: string; name: string; code: string };
  _count: { concepts: number };
}

export interface CourseDetail extends Omit<CourseSummary, "_count"> {
  concepts: CourseConcept[];
  /** Whether the viewer may consume this course's content. Staff always true. */
  isEntitled: boolean;
}

// Deliberately narrower than CourseSummary — mirrors the exact fields the
// public, unauthenticated /catalog/public/courses select returns.
export interface PublicCourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  estimatedHours: number | null;
  gradeBand: string | null;
  learningSubject: { id: string; name: string; code: string };
  _count: { concepts: number };
}

export interface LearningPathSummary {
  id: string;
  learningSubjectId: string;
  title: string;
  slug: string;
  description: string | null;
  unlockMode: "FREE_ROAM" | "SEQUENTIAL";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  learningSubject: { id: string; name: string; code: string };
  _count: { pathCourses: number };
}

export interface LearningPathCourseEntry {
  id: string;
  pathId: string;
  courseId: string;
  sortOrder: number;
  isRequired: boolean;
  course: CourseSummary;
  isDone: boolean;
  isLocked: boolean;
}

export interface LearningPathDetail extends Omit<LearningPathSummary, "_count"> {
  pathCourses: LearningPathCourseEntry[];
}

export interface CreateLearningSubjectPayload {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface CreateCoursePayload {
  learningSubjectId: string;
  title: string;
  slug: string;
  description?: string;
  estimatedHours?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder?: number;
  // The API validated all of these long before it persisted them; the client
  // type stopped at the truncated subset the service used to write, which is
  // why no form could ever price a course.
  durationWeeks?: number;
  thumbnailUrl?: string;
  gradeBand?: GradeBand;
  deliveryMode?: DeliveryMode;
  /** Null/omitted = not sold a la carte; reachable only inside a program. */
  priceOneTimeCents?: number | null;
  priceMonthlyCents?: number | null;
  installmentCount?: number | null;
}

export interface CreateLearningPathPayload {
  learningSubjectId: string;
  title: string;
  slug: string;
  description?: string;
  unlockMode?: "FREE_ROAM" | "SEQUENTIAL";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder?: number;
}

// ─── RTK Query Endpoints ──────────────────────────────────────────────────────

export const catalogApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Learning subjects (top-level groups: Math, Coding, Science, ...)
    getLearningSubjects: builder.query<LearningSubject[], void>({
      query: () => "/catalog/subjects",
      providesTags: ["LearningSubjects"],
    } as any),

    createLearningSubject: builder.mutation<LearningSubject, CreateLearningSubjectPayload>({
      query: (body: any) => ({
        url: "/catalog/subjects",
        method: "POST",
        body,
      }),
      invalidatesTags: ["LearningSubjects" as any],
    } as any),

    // Courses (content groupings of chapters/concepts)
    getCourses: builder.query<
      { items: CourseSummary[]; total: number },
      | {
          subjectId?: string;
          page?: number;
          limit?: number;
          search?: string;
          sortBy?: string;
          sortOrder?: string;
        }
      | void
    >({
      query: (params: any) => {
        const q = new URLSearchParams();
        if (params?.subjectId) q.set("subjectId", params.subjectId);
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.search) q.set("search", params.search);
        if (params?.sortBy) {
          q.set("sortBy", params.sortBy);
          q.set("sortOrder", params.sortOrder ?? "asc");
        }
        const query = q.toString();
        return `/catalog/courses${query ? `?${query}` : ""}`;
      },
      providesTags: ["Courses"],
    } as any),

    // Anonymous course search for the public marketing site (no auth cookie
    // required — hits /catalog/public/courses, which only ever returns
    // published courses with no pricing/internal fields).
    getPublicCourses: builder.query<
      { items: PublicCourseSummary[]; total: number; page: number; pageSize: number },
      { search?: string; page?: number; limit?: number } | void
    >({
      query: (params: any) => {
        const q = new URLSearchParams();
        if (params?.search) q.set("search", params.search);
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        const query = q.toString();
        return `/catalog/public/courses${query ? `?${query}` : ""}`;
      },
    } as any),

    // Course teaching staff — a plain many-to-many, which is all that
    // "one course, many teachers" ever needed.
    getCourseTeachers: builder.query<
      Array<{
        role: string;
        assignedAt: string;
        teacherProfile: {
          id: string;
          fullName: string;
          specialization: string | null;
          status: string;
        };
      }>,
      string
    >({
      query: (courseId: any) => `/catalog/courses/${courseId}/teachers`,
      providesTags: ["CourseDetail"],
    } as any),

    attachCourseTeacher: builder.mutation<
      unknown,
      { courseId: string; teacherProfileId: string; role?: string }
    >({
      query: ({ courseId, ...body }: any) => ({
        url: `/catalog/courses/${courseId}/teachers`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CourseDetail"],
    } as any),

    detachCourseTeacher: builder.mutation<
      unknown,
      { courseId: string; teacherProfileId: string }
    >({
      query: ({ courseId, teacherProfileId }: any) => ({
        url: `/catalog/courses/${courseId}/teachers/${teacherProfileId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CourseDetail"],
    } as any),

    // Slug -> id resolution for checkout. The public SKU pages link with a
    // slug (it is the indexable URL), while the billing API keys off ids.
    getPublicProgramBySlug: builder.query<
      {
        id: string;
        name: string;
        slug: string;
        shortDescription: string | null;
        priceOneTimeCents: number | null;
        priceMonthlyCents: number | null;
        installmentCount: number | null;
        currency: string;
        deliveryMode: string;
        courses: Array<{ id: string; title: string }>;
      },
      string
    >({
      query: (slug: any) => `/catalog/public/programs/${slug}`,
    } as any),

    getPublicCourseBySlug: builder.query<
      {
        id: string;
        title: string;
        slug: string;
        description: string | null;
        priceOneTimeCents: number | null;
        priceMonthlyCents: number | null;
        installmentCount: number | null;
        currency: string;
        deliveryMode: string;
      },
      string
    >({
      query: (slug: any) => `/catalog/public/courses/${slug}`,
    } as any),

    getCourseDetail: builder.query<CourseDetail, string>({
      query: (id: string) => `/catalog/courses/${id}`,
      providesTags: (_result: any, _err: any, id: any) => [{ type: "CourseDetail" as any, id }],
    } as any),

    createCourse: builder.mutation<CourseSummary, CreateCoursePayload>({
      query: (body: any) => ({
        url: "/catalog/courses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Courses" as any],
    } as any),

    updateCourse: builder.mutation<CourseSummary, { id: string; body: Partial<CreateCoursePayload> }>({
      query: ({ id, body }: any) => ({
        url: `/catalog/courses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result: any, _err: any, { id }: any) => [
        "Courses" as any,
        { type: "CourseDetail" as any, id },
      ],
    } as any),

    // Learning paths (curated, ordered course sequences)
    getLearningPaths: builder.query<LearningPathSummary[], { subjectId?: string } | void>({
      query: (params: any) => {
        const q = params?.subjectId ? `?subjectId=${params.subjectId}` : "";
        return `/catalog/paths${q}`;
      },
      providesTags: ["LearningPaths"],
    } as any),

    getLearningPathDetail: builder.query<LearningPathDetail, string>({
      query: (id: string) => `/catalog/paths/${id}`,
      providesTags: (_result: any, _err: any, id: any) => [{ type: "LearningPathDetail" as any, id }],
    } as any),

    createLearningPath: builder.mutation<LearningPathSummary, CreateLearningPathPayload>({
      query: (body: any) => ({
        url: "/catalog/paths",
        method: "POST",
        body,
      }),
      invalidatesTags: ["LearningPaths" as any],
    } as any),

    addCourseToPath: builder.mutation<any, { pathId: string; courseId: string; sortOrder?: number; isRequired?: boolean }>({
      query: ({ pathId, ...body }: any) => ({
        url: `/catalog/paths/${pathId}/courses`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result: any, _err: any, { pathId }: any) => [
        "LearningPaths" as any,
        { type: "LearningPathDetail" as any, id: pathId },
      ],
    } as any),

    reorderPathCourses: builder.mutation<any, { pathId: string; courses: { courseId: string; sortOrder: number }[] }>({
      query: ({ pathId, courses }: any) => ({
        url: `/catalog/paths/${pathId}/courses/reorder`,
        method: "PATCH",
        body: { courses },
      }),
      invalidatesTags: (_result: any, _err: any, { pathId }: any) => [
        { type: "LearningPathDetail" as any, id: pathId },
      ],
    } as any),

    removeCourseFromPath: builder.mutation<any, { pathId: string; courseId: string }>({
      query: ({ pathId, courseId }: any) => ({
        url: `/catalog/paths/${pathId}/courses/${courseId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result: any, _err: any, { pathId }: any) => [
        "LearningPaths" as any,
        { type: "LearningPathDetail" as any, id: pathId },
      ],
    } as any),

    // Module items (Coursera-style Video/Reading/Discussion/Assessment items)
    createModuleItem: builder.mutation<ModuleItem, CreateModuleItemPayload>({
      query: (body: any) => ({
        url: "/catalog/module-items",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Courses" as any, "CourseDetail" as any],
    } as any),

    updateModuleItem: builder.mutation<ModuleItem, { id: string; body: Partial<CreateModuleItemPayload> }>({
      query: ({ id, body }: any) => ({
        url: `/catalog/module-items/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["CourseDetail" as any],
    } as any),

    deleteModuleItem: builder.mutation<void, string>({
      query: (id: string) => ({
        url: `/catalog/module-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CourseDetail" as any],
    } as any),

    updateModuleItemProgress: builder.mutation<
      any,
      { id: string; completed?: boolean; lastPositionSeconds?: number; notes?: string }
    >({
      query: ({ id, ...body }: any) => ({
        url: `/catalog/module-items/${id}/progress`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CourseDetail" as any, "GamificationToday" as any],
    } as any),

    getMyAssignmentForItem: builder.query<
      { assignment: { id: string; status: string; dueAt: string } | null },
      string
    >({
      query: (moduleItemId: string) => `/catalog/module-items/${moduleItemId}/my-assignment`,
    } as any),

    /**
     * The brief for a HOMEWORK checkpoint plus this learner's submission.
     * Tagged so submitting refreshes it — the view flips from "hand it in" to
     * "handed in" off the back of this.
     */
    getMyHomeworkForItem: builder.query<
      {
        homework: {
          id: string;
          title: string;
          description: string | null;
          dueDate: string | null;
          maxPoints: number;
        };
        submission: {
          id: string;
          status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE";
          content: string | null;
          submissionDate: string;
          pointsEarned: number | null;
          feedback: string | null;
          gradedAt: string | null;
          attachments: {
            fileUploadId: string;
            sortOrder: number;
            file: { originalName: string; size: number; mimetype: string };
          }[];
        } | null;
      },
      string
    >({
      query: (moduleItemId: string) => `/catalog/module-items/${moduleItemId}/my-homework`,
      providesTags: ["Homework"],
    } as any),

    getMySessionForItem: builder.query<
      { session: MyLiveSession | null; reason: MyLiveSessionReason | null },
      string
    >({
      query: (moduleItemId: string) => `/catalog/module-items/${moduleItemId}/my-session`,
    } as any),

    getDiscussion: builder.query<DiscussionThread, string>({
      query: (moduleItemId: string) => `/catalog/module-items/${moduleItemId}/discussion`,
      providesTags: (_result: any, _err: any, id: any) => [{ type: "Discussion" as any, id }],
    } as any),

    addDiscussionPost: builder.mutation<DiscussionPost, { moduleItemId: string; body: string; parentPostId?: string }>({
      query: ({ moduleItemId, ...body }: any) => ({
        url: `/catalog/module-items/${moduleItemId}/discussion/posts`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result: any, _err: any, { moduleItemId }: any) => [
        { type: "Discussion" as any, id: moduleItemId },
      ],
    } as any),
  }),
});

export const {
  useGetLearningSubjectsQuery,
  useCreateLearningSubjectMutation,
  useGetCoursesQuery,
  useGetPublicCoursesQuery,
  useGetCourseTeachersQuery,
  useAttachCourseTeacherMutation,
  useDetachCourseTeacherMutation,
  useGetPublicProgramBySlugQuery,
  useGetPublicCourseBySlugQuery,
  useGetCourseDetailQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useGetLearningPathsQuery,
  useGetLearningPathDetailQuery,
  useCreateLearningPathMutation,
  useAddCourseToPathMutation,
  useReorderPathCoursesMutation,
  useRemoveCourseFromPathMutation,
  useCreateModuleItemMutation,
  useUpdateModuleItemMutation,
  useDeleteModuleItemMutation,
  useUpdateModuleItemProgressMutation,
  useGetMyAssignmentForItemQuery,
  useGetMyHomeworkForItemQuery,
  useGetMySessionForItemQuery,
  useGetDiscussionQuery,
  useAddDiscussionPostMutation,
} = catalogApi;
