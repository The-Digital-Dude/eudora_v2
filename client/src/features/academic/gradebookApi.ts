import { authApi } from "../auth/authApi";

export interface GradeBookEntry {
  id: string;
  studentProfileId: string;
  courseClassId: string | null;
  classSectionId: string | null;
  termId: string | null;
  sourceType: "HOMEWORK_SUBMISSION" | "ASSESSMENT_ATTEMPT" | "RUBRIC_ASSESSMENT" | "MANUAL";
  sourceId: string | null;
  title: string;
  category: string;
  pointsEarned: number | null;
  pointsPossible: number;
  percentage: number | null;
  weight: number;
  status: "DRAFT" | "PUBLISHED" | "EXCLUDED";
  notes: string | null;
  assessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  fullName: string;
}

export interface ClassGradebookResponse {
  students: StudentProfile[];
  entries: GradeBookEntry[];
}

export interface StudentGradeSummary {
  categoryAverages: Record<string, number>;
  termAverage: number | null;
  gpa: number | null;
  letterGrade: string;
  classRank: number | null;
  classPercentile: number | null;
}

export interface ClassGradebookSummaryItem extends StudentGradeSummary {
  studentId: string;
  fullName: string;
}

export interface CreateManualGradePayload {
  studentProfileId: string;
  courseClassId?: string;
  classSectionId?: string;
  termId?: string;
  title: string;
  category?: string;
  pointsEarned?: number;
  pointsPossible: number;
  weight?: number;
  status?: "DRAFT" | "PUBLISHED" | "EXCLUDED";
  notes?: string;
  sourceId?: string;
}

export interface UpdateGradeEntryPayload {
  id: string;
  pointsEarned?: number;
  pointsPossible?: number;
  weight?: number;
  status?: "DRAFT" | "PUBLISHED" | "EXCLUDED";
  notes?: string;
}

export interface BulkUpsertGradesPayload {
  entries: CreateManualGradePayload[];
}

export const gradebookApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getGradebookForClass: builder.query<ClassGradebookResponse, { courseClassId: string; termId?: string }>({
      query: ({ courseClassId, termId }) => ({
        url: `/gradebook/course-class/${courseClassId}`,
        params: termId ? { termId } : {},
      }),
      providesTags: ["Gradebook"],
    }),

    getGradebookForClassSection: builder.query<ClassGradebookResponse, { classSectionId: string; termId?: string }>({
      query: ({ classSectionId, termId }) => ({
        url: `/gradebook/class-section/${classSectionId}`,
        params: termId ? { termId } : {},
      }),
      providesTags: ["Gradebook"],
    }),

    getStudentGrades: builder.query<GradeBookEntry[], { studentProfileId: string; termId?: string }>({
      query: ({ studentProfileId, termId }) => ({
        url: `/gradebook/student/${studentProfileId}`,
        params: termId ? { termId } : {},
      }),
      providesTags: ["Gradebook"],
    }),

    getStudentSummary: builder.query<StudentGradeSummary, { studentProfileId: string; termId?: string }>({
      query: ({ studentProfileId, termId }) => ({
        url: `/gradebook/student/${studentProfileId}/summary`,
        params: termId ? { termId } : {},
      }),
      providesTags: ["Gradebook"],
    }),

    getClassSummary: builder.query<ClassGradebookSummaryItem[], { courseClassId: string; termId?: string }>({
      query: ({ courseClassId, termId }) => ({
        url: `/gradebook/course-class/${courseClassId}/summary`,
        params: termId ? { termId } : {},
      }),
      providesTags: ["Gradebook"],
    }),

    createManualGrade: builder.mutation<GradeBookEntry, CreateManualGradePayload>({
      query: (body) => ({
        url: "/gradebook/manual-entry",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Gradebook"],
    }),

    updateGradeEntry: builder.mutation<GradeBookEntry, UpdateGradeEntryPayload>({
      query: ({ id, ...body }) => ({
        url: `/gradebook/entries/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Gradebook"],
    }),

    deleteGradeEntry: builder.mutation<GradeBookEntry, string>({
      query: (id) => ({
        url: `/gradebook/entries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Gradebook"],
    }),

    bulkUpsertGrades: builder.mutation<GradeBookEntry[], BulkUpsertGradesPayload>({
      query: (body) => ({
        url: "/gradebook/entries/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Gradebook"],
    }),

    syncGrades: builder.mutation<{ homeworkSyncCount: number; assessmentSyncCount: number }, void>({
      query: () => ({
        url: "/gradebook/sync",
        method: "POST",
      }),
      invalidatesTags: ["Gradebook"],
    }),
  }),
});

export const {
  useGetGradebookForClassQuery,
  useGetGradebookForClassSectionQuery,
  useGetStudentGradesQuery,
  useGetStudentSummaryQuery,
  useGetClassSummaryQuery,
  useCreateManualGradeMutation,
  useUpdateGradeEntryMutation,
  useDeleteGradeEntryMutation,
  useBulkUpsertGradesMutation,
  useSyncGradesMutation,
} = gradebookApi;
