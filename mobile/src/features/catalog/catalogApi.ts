import { api } from '@/core/api/api';
import type {
  CourseDetail,
  CourseSummary,
  DiscussionThread,
  LearningSubject,
  MyAssignmentForItem,
  UpdateModuleItemProgressPayload,
} from '@/core/contracts';

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

    getCourses: builder.query<CourseSummary[], { subjectId?: string } | void>({
      query: (params) =>
        params?.subjectId
          ? `/catalog/courses?subjectId=${params.subjectId}`
          : '/catalog/courses',
      providesTags: ['Courses'],
    }),

    getCourseDetail: builder.query<CourseDetail, string>({
      query: (id) => `/catalog/courses/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'CourseDetail', id }],
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

    getDiscussion: builder.query<DiscussionThread, string>({
      query: (moduleItemId) => `/catalog/module-items/${moduleItemId}/discussion`,
      providesTags: (_r, _e, moduleItemId) => [
        { type: 'Discussion', id: moduleItemId },
      ],
    }),

    addDiscussionPost: builder.mutation<
      unknown,
      { moduleItemId: string; body: string; parentPostId?: string }
    >({
      query: ({ moduleItemId, ...body }) => ({
        url: `/catalog/module-items/${moduleItemId}/discussion/posts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { moduleItemId }) => [
        { type: 'Discussion', id: moduleItemId },
      ],
    }),

    getMyAssignmentForItem: builder.query<
      { assignment: MyAssignmentForItem | null },
      string
    >({
      query: (moduleItemId) => `/catalog/module-items/${moduleItemId}/my-assignment`,
      providesTags: (_r, _e, moduleItemId) => [
        { type: 'Assignment', id: moduleItemId },
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
