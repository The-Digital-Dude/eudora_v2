import { api } from '@/core/api/api';
import type {
  ChildAttendanceRecord,
  ChildGradeEntry,
  ChildHomeworkItem,
  ChildLearningSummary,
  ChildSummary,
  ChildTeacher,
  CreateGuardianProfilePayload,
  FamilyInvoice,
  FamilyPayment,
  GradebookSummary,
  SelfLinkStudentPayload,
  UpdateGuardianProfilePayload,
} from '@/core/contracts';

export const guardianApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    getChildren: builder.query<ChildSummary[], void>({
      query: () => '/parent/children',
      providesTags: ['Children'],
    }),

    getChildLearning: builder.query<ChildLearningSummary, string>({
      query: (studentProfileId) =>
        `/parent/children/${studentProfileId}/learning`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Children', id: studentProfileId },
      ],
    }),

    getChildTeachers: builder.query<ChildTeacher[], string>({
      query: (studentProfileId) =>
        `/parent/children/${studentProfileId}/teachers`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Children', id: studentProfileId },
      ],
    }),

    getChildAttendance: builder.query<ChildAttendanceRecord[], string>({
      query: (studentProfileId) =>
        `/parent/children/${studentProfileId}/attendance`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Children', id: studentProfileId },
      ],
    }),

    getChildHomework: builder.query<ChildHomeworkItem[], string>({
      query: (studentProfileId) =>
        `/parent/children/${studentProfileId}/homework`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Children', id: studentProfileId },
      ],
    }),

    getChildGrades: builder.query<ChildGradeEntry[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/grades`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Children', id: studentProfileId },
      ],
    }),

    /**
     * Creates the caller's own GuardianProfile — `userId` isn't in the
     * payload because the backend forces it to the caller's own id for a
     * GUARDIAN-only caller (`family.controller.ts`), so a mobile client
     * couldn't create a profile for anyone else even if it tried.
     *
     * Deliberately does NOT invalidate the `Me` tag: `app/index.tsx` routes
     * on `guardianProfile` presence, so invalidating here would yank the
     * user out of the onboarding wizard (into `GuardianHomeScreen`) the
     * instant step 1 finishes, before they reach step 2. The wizard
     * triggers the `Me` refetch itself once it's actually done.
     */
    createGuardianProfile: builder.mutation<
      { id: string },
      CreateGuardianProfilePayload
    >({
      query: (body) => ({ url: '/guardian-profiles', method: 'POST', body }),
    }),

    /** Editing an existing profile from Settings — unlike the onboarding
     * wizard's `createGuardianProfile`, this safely invalidates `Me`
     * immediately; there's no multi-step flow here to protect. */
    updateGuardianProfile: builder.mutation<
      unknown,
      { id: string } & UpdateGuardianProfilePayload
    >({
      query: ({ id, ...body }) => ({
        url: `/guardian-profiles/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),

    selfLinkStudent: builder.mutation<unknown, SelfLinkStudentPayload>({
      query: (body) => ({
        url: '/guardian-relationships/self-link',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Children'],
    }),

    getChildGradebookSummary: builder.query<GradebookSummary, string>({
      query: (studentProfileId) => `/gradebook/student/${studentProfileId}/summary`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Children', id: studentProfileId },
      ],
    }),

    getInvoices: builder.query<FamilyInvoice[], void>({
      query: () => '/parent/billing/invoices',
      providesTags: ['Billing'],
    }),

    getPayments: builder.query<FamilyPayment[], void>({
      query: () => '/parent/billing/payments',
      providesTags: ['Billing'],
    }),
  }),
});

export const {
  useGetChildrenQuery,
  useGetChildLearningQuery,
  useGetChildTeachersQuery,
  useGetChildAttendanceQuery,
  useGetChildHomeworkQuery,
  useGetChildGradesQuery,
  useGetChildGradebookSummaryQuery,
  useCreateGuardianProfileMutation,
  useUpdateGuardianProfileMutation,
  useSelfLinkStudentMutation,
  useGetInvoicesQuery,
  useGetPaymentsQuery,
} = guardianApi;
