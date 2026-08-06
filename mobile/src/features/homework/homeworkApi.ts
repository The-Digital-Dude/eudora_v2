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
    getMyPendingHomework: builder.query<PendingHomeworkItem[], void>({
      query: () => '/homework/me/pending',
      providesTags: ['Homework'],
    }),

    getMySubmissions: builder.query<HomeworkSubmissionRecord[], string>({
      query: (studentProfileId) => `/homework/student/${studentProfileId}`,
      providesTags: ['Homework'],
    }),

    submitHomework: builder.mutation<HomeworkSubmissionRecord, SubmitHomeworkPayload>({
      query: (body) => ({ url: '/homework/submit', method: 'POST', body }),
      invalidatesTags: ['Homework'],
    }),
  }),
});

export const {
  useGetMyPendingHomeworkQuery,
  useGetMySubmissionsQuery,
  useSubmitHomeworkMutation,
} = homeworkApi;
