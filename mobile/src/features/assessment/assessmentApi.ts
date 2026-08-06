import { api } from '@/core/api/api';
import type {
  Assignment,
  AssessmentAttempt,
  AssignmentSummary,
  AttemptQuestion,
  AttemptResponse,
  AttemptSummary,
  PagedResult,
  SaveResponsePayload,
  StartAttemptPayload,
} from '@/core/contracts';

export const assessmentApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    getAssignment: builder.query<Assignment, string>({
      query: (id) => `/assignments/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Assignment', id }],
    }),

    startAttempt: builder.mutation<AssessmentAttempt, StartAttemptPayload>({
      query: (body) => ({ url: '/attempts', method: 'POST', body }),
    }),

    getAttemptQuestions: builder.query<AttemptQuestion[], string>({
      query: (attemptId) => `/attempts/${attemptId}/questions`,
      providesTags: (_r, _e, attemptId) => [
        { type: 'AssessmentAttempt', id: attemptId },
      ],
    }),

    saveResponse: builder.mutation<AttemptResponse, SaveResponsePayload>({
      query: (body) => ({ url: '/responses', method: 'POST', body }),
    }),

    submitAttempt: builder.mutation<AssessmentAttempt, string>({
      query: (attemptId) => ({
        url: `/attempts/${attemptId}/submit`,
        method: 'POST',
      }),
    }),

    /** Browse — distinct from `getAssignment` above, which deep-links to one by ID. */
    getStudentAssignments: builder.query<PagedResult<AssignmentSummary>, string>({
      query: (studentProfileId) => `/students/${studentProfileId}/assignments`,
      providesTags: ['Assignment'],
    }),

    getStudentAttempts: builder.query<PagedResult<AttemptSummary>, string>({
      query: (studentProfileId) => `/students/${studentProfileId}/attempts`,
      providesTags: ['AssessmentAttempt'],
    }),
  }),
});

export const {
  useGetAssignmentQuery,
  useStartAttemptMutation,
  useGetAttemptQuestionsQuery,
  useSaveResponseMutation,
  useSubmitAttemptMutation,
  useGetStudentAssignmentsQuery,
  useGetStudentAttemptsQuery,
} = assessmentApi;
