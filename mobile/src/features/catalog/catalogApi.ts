import { api } from '@/core/api/api';
import type {
  CourseDetail,
  CourseSummary,
  DiscussionThread,
  LearningSubject,
  MyAssignmentForItem,
  UpdateModuleItemProgressPayload,
} from '@/core/contracts';

/**
 * Every query below varies by which learner the request is about, and the
 * server decides that from the `x-acting-student-id` header — which RTK Query
 * knows nothing about when it builds a cache key.
 *
 * So the child id rides in the *argument* as well as the header. Without it a
 * guardian with two children gets one cache entry for both: switch child and
 * the screen shows the sibling's progress until something happens to refetch.
 * `actingChildId` is null for a student acting as themselves, which is a
 * distinct, valid key rather than a missing one.
 */
export interface ChildScoped {
  actingChildId: string | null;
}

/** Keeps tag ids per-learner for the same reason the cache key is. */
const scopedId = (id: string, actingChildId: string | null) =>
  `${id}:${actingChildId ?? 'self'}`;

export const catalogApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    getSubjects: builder.query<LearningSubject[], void>({
      query: () => '/catalog/subjects',
      providesTags: ['Subjects'],
    }),

    getCourses: builder.query<
      CourseSummary[],
      ChildScoped & { subjectId?: string }
    >({
      query: ({ subjectId }) =>
        subjectId
          ? `/catalog/courses?subjectId=${subjectId}`
          : '/catalog/courses',
      providesTags: ['Courses'],
    }),

    getCourseDetail: builder.query<CourseDetail, ChildScoped & { courseId: string }>({
      query: ({ courseId }) => `/catalog/courses/${courseId}`,
      providesTags: (_r, _e, { courseId, actingChildId }) => [
        { type: 'CourseDetail', id: scopedId(courseId, actingChildId) },
      ],
    }),

    updateModuleItemProgress: builder.mutation<
      unknown,
      { id: string } & UpdateModuleItemProgressPayload
    >({
      query: ({ id, ...body }) => ({
        url: `/catalog/module-items/${id}/progress`,
        method: 'POST',
        body,
      }),
      // Untargeted like submitCard: completing an item can flip isDone on the
      // concept and unlock a later chapter, and the exact course a given item
      // belongs to isn't threaded through every call site.
      invalidatesTags: ['CourseDetail', 'GamificationToday'],
    }),

    getDiscussion: builder.query<
      DiscussionThread,
      ChildScoped & { moduleItemId: string }
    >({
      query: ({ moduleItemId }) =>
        `/catalog/module-items/${moduleItemId}/discussion`,
      providesTags: (_r, _e, { moduleItemId, actingChildId }) => [
        { type: 'Discussion', id: scopedId(moduleItemId, actingChildId) },
      ],
    }),

    addDiscussionPost: builder.mutation<
      unknown,
      ChildScoped & { moduleItemId: string; body: string; parentPostId?: string }
    >({
      query: ({ moduleItemId, actingChildId: _ignored, ...body }) => ({
        url: `/catalog/module-items/${moduleItemId}/discussion/posts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { moduleItemId, actingChildId }) => [
        { type: 'Discussion', id: scopedId(moduleItemId, actingChildId) },
      ],
    }),

    getMyAssignmentForItem: builder.query<
      { assignment: MyAssignmentForItem | null },
      ChildScoped & { moduleItemId: string }
    >({
      query: ({ moduleItemId }) =>
        `/catalog/module-items/${moduleItemId}/my-assignment`,
      providesTags: (_r, _e, { moduleItemId, actingChildId }) => [
        { type: 'Assignment', id: scopedId(moduleItemId, actingChildId) },
      ],
    }),
  }),
});

export const {
  useGetSubjectsQuery,
  useGetCoursesQuery,
  useGetCourseDetailQuery,
  useUpdateModuleItemProgressMutation,
  useGetDiscussionQuery,
  useAddDiscussionPostMutation,
  useGetMyAssignmentForItemQuery,
} = catalogApi;
