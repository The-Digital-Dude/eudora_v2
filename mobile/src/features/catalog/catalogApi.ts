import { api } from '@/core/api/api';
import type {
  CourseDetail,
  CourseSummary,
  DiscussionThread,
  LearningSubject,
  ModuleItemHomework,
  ModuleItemLiveClass,
  MyAssignmentForItem,
  MyEntitlements,
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

    /**
     * `GET /catalog/courses` is paginated server-side
     * (`catalogService.listCourses` always returns `{items, total, page,
     * pageSize}`), and the API's envelope interceptor detects that shape and
     * flattens it: `data` becomes the bare items array, with the totals
     * moved to `meta.pagination`. `baseQuery.ts`'s own `unwrap()` then
     * reverses exactly that — `{items, pagination}` — so the *hook's* raw
     * result is a wrapper object, never the bare array every caller here was
     * written against (`StudentHomeScreen`, `app/course/index.tsx`, both call
     * `.filter`/`.map` directly on it). `transformResponse` undoes the
     * wrapping a second time, back to a plain array, matching what every
     * consumer has always assumed. Caught by actually opening the course
     * list in a browser — a crash no typecheck could have found, since
     * `unwrap()`'s return type is `unknown` by design.
     */
    getCourses: builder.query<
      CourseSummary[],
      ChildScoped & { subjectId?: string }
    >({
      query: ({ subjectId }) =>
        subjectId
          ? `/catalog/courses?subjectId=${subjectId}`
          : '/catalog/courses',
      transformResponse: (response: CourseSummary[] | { items: CourseSummary[] }) =>
        Array.isArray(response) ? response : response.items,
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

    getMyHomeworkForItem: builder.query<
      ModuleItemHomework,
      ChildScoped & { moduleItemId: string }
    >({
      query: ({ moduleItemId }) =>
        `/catalog/module-items/${moduleItemId}/my-homework`,
      providesTags: (_r, _e, { moduleItemId, actingChildId }) => [
        { type: 'ItemHomework', id: scopedId(moduleItemId, actingChildId) },
      ],
    }),

    getMySessionForItem: builder.query<
      ModuleItemLiveClass,
      ChildScoped & { moduleItemId: string }
    >({
      query: ({ moduleItemId }) =>
        `/catalog/module-items/${moduleItemId}/my-session`,
      providesTags: (_r, _e, { moduleItemId, actingChildId }) => [
        { type: 'LiveSession', id: scopedId(moduleItemId, actingChildId) },
      ],
    }),

    /**
     * The acting child's owned course ids, for badging the browse list without
     * fetching full detail for every card. `GET /catalog/courses/:id` (above)
     * carries the richer `isEntitled`/`isContentLocked` once a course is
     * actually opened; this is the cheap set-membership check for the list.
     */
    getEntitlementsMe: builder.query<MyEntitlements, ChildScoped>({
      query: () => '/entitlements/me',
      providesTags: ['Entitlements'],
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
  useGetMyHomeworkForItemQuery,
  useGetMySessionForItemQuery,
  useGetEntitlementsMeQuery,
} = catalogApi;
