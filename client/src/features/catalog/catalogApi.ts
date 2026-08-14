import { authApi } from "../auth/authApi";

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

export type ModuleItemKind = "VIDEO" | "READING" | "DISCUSSION" | "ASSESSMENT";

export interface ModuleItem {
  id: string;
  conceptId: string;
  kind: ModuleItemKind;
  title: string;
  sortOrder: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  readingContent: string | null;
  assessmentId: string | null;
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

export interface CourseSummary {
  id: string;
  learningSubjectId: string;
  title: string;
  slug: string;
  description: string | null;
  estimatedHours: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  learningSubject: { id: string; name: string; code: string };
  _count: { concepts: number };
}

export interface CourseDetail extends Omit<CourseSummary, "_count"> {
  concepts: CourseConcept[];
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
  useGetDiscussionQuery,
  useAddDiscussionPostMutation,
} = catalogApi;
