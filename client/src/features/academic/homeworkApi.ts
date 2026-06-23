import { authApi } from "../auth/authApi";

export interface Homework {
  id: string;
  courseClassId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  maxPoints: number;
  attachmentUrls: string[];
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
  courseClass?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentProfileId: string;
  submissionDate: string;
  content?: string | null;
  attachmentUrls: string[];
  status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE";
  pointsEarned?: number | null;
  feedback?: string | null;
  gradedById?: string | null;
  gradedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  studentProfile?: {
    id: string;
    fullName: string;
  };
  homework?: Homework;
}

export interface CreateHomeworkPayload {
  courseClassId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxPoints: number;
  attachmentUrls?: string[];
}

export interface UpdateHomeworkPayload {
  id: string;
  title?: string;
  description?: string;
  dueDate?: string;
  maxPoints?: number;
  attachmentUrls?: string[];
}

export interface SubmitHomeworkPayload {
  homeworkId: string;
  content?: string;
  attachmentUrls?: string[];
}

export interface GradeSubmissionPayload {
  submissionId: string;
  pointsEarned: number;
  feedback?: string;
}

export const homeworkApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getHomeworkForClass: builder.query<Homework[], string>({
      query: (courseClassId) => `/homework/course-class/${courseClassId}`,
      providesTags: (result, error, courseClassId) => [
        { type: "Homework", id: `LIST-${courseClassId}` },
      ],
    }),

    getHomeworkSubmissions: builder.query<HomeworkSubmission[], string>({
      query: (homeworkId) => `/homework/submissions/homework/${homeworkId}`,
      providesTags: (result, error, homeworkId) => [
        { type: "Homework", id: `SUBMISSIONS-${homeworkId}` },
      ],
    }),

    getStudentSubmissions: builder.query<HomeworkSubmission[], string>({
      query: (studentProfileId) => `/homework/student/${studentProfileId}`,
      providesTags: (result, error, studentProfileId) => [
        { type: "Homework", id: `STUDENT-${studentProfileId}` },
      ],
    }),

    getStudentPendingHomework: builder.query<Homework[], string>({
      query: (studentProfileId) => `/homework/student/${studentProfileId}/pending`,
      providesTags: (result, error, studentProfileId) => [
        { type: "Homework", id: `PENDING-${studentProfileId}` },
      ],
    }),

    getMyPendingHomework: builder.query<Homework[], void>({
      query: () => "/homework/me/pending",
      providesTags: () => [{ type: "Homework", id: "MY-PENDING" }],
    }),

    createHomework: builder.mutation<Homework, CreateHomeworkPayload>({
      query: (body) => ({
        url: "/homework",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { courseClassId }) => [
        { type: "Homework", id: `LIST-${courseClassId}` },
        { type: "Homework", id: "MY-PENDING" },
      ],
    }),

    updateHomework: builder.mutation<Homework, UpdateHomeworkPayload>({
      query: ({ id, ...body }) => ({
        url: `/homework/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Homework" }],
    }),

    submitHomework: builder.mutation<HomeworkSubmission, SubmitHomeworkPayload>({
      query: (body) => ({
        url: "/homework/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { homeworkId }) => [{ type: "Homework" }],
    }),

    gradeHomeworkSubmission: builder.mutation<HomeworkSubmission, GradeSubmissionPayload>({
      query: ({ submissionId, ...body }) => ({
        url: `/homework/submissions/${submissionId}/grade`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { submissionId }) => [{ type: "Homework" }],
    }),

    getCourseClassById: builder.query<any, string>({
      query: (id) => `/course-classes/${id}`,
    }),
  }),
});

export const {
  useGetHomeworkForClassQuery,
  useGetHomeworkSubmissionsQuery,
  useGetStudentSubmissionsQuery,
  useGetStudentPendingHomeworkQuery,
  useGetMyPendingHomeworkQuery,
  useCreateHomeworkMutation,
  useUpdateHomeworkMutation,
  useSubmitHomeworkMutation,
  useGradeHomeworkSubmissionMutation,
  useGetCourseClassByIdQuery,
} = homeworkApi;
