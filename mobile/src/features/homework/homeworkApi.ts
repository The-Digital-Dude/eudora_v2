import { api } from '@/core/api/api';
import type {
  HomeworkSubmissionRecord,
  PendingHomeworkItem,
  SubmitHomeworkPayload,
} from '@/core/contracts';

export const homeworkApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Addressed by student id rather than `/homework/me/pending`, which
     * resolves the caller's own profile and so throws for a guardian — who has
     * none. The student-addressed route serves both: `assertCanAccessStudentRecord`
     * short-circuits when the caller *is* that student, and otherwise verifies
     * the guardian-child link.
     *
     * One endpoint instead of branching on role, so there is no second path to
     * keep in step.
     */
    getPendingHomework: builder.query<PendingHomeworkItem[], string>({
      query: (studentProfileId) =>
        `/homework/student/${studentProfileId}/pending`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Homework', id: studentProfileId },
      ],
    }),

    getMySubmissions: builder.query<HomeworkSubmissionRecord[], string>({
      query: (studentProfileId) => `/homework/student/${studentProfileId}`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Homework', id: studentProfileId },
      ],
    }),

    submitHomework: builder.mutation<HomeworkSubmissionRecord, SubmitHomeworkPayload>({
      query: (body) => ({ url: '/homework/submit', method: 'POST', body }),
      invalidatesTags: ['Homework'],
    }),
  }),
});

export const {
  useGetPendingHomeworkQuery,
  useGetMySubmissionsQuery,
  useSubmitHomeworkMutation,
} = homeworkApi;
