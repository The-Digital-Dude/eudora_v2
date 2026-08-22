import { authApi } from "../auth/authApi";

/** One handed-in file. The bytes are private; `fileUploadId` is what fetches them. */
export interface HomeworkAttachment {
  fileUploadId: string;
  sortOrder: number;
  file: { originalName: string; size: number; mimetype: string };
}

export interface Homework {
  id: string;
  /** Null for a course checkpoint, which belongs to a chapter rather than a cohort. */
  batchId: string | null;
  title: string;
  description?: string | null;
  /** Null for a self-paced checkpoint — nothing to be late for. */
  dueDate: string | null;
  maxPoints: number;
  attachmentUrls: string[];
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
  batch?: {
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
  /**
   * Replaces the old `attachmentUrls`. Those were public links written by the
   * client; these are managed private files reached through
   * homeworkAttachmentUrl(), which the API gates per reader.
   */
  attachments: HomeworkAttachment[];
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

export type CheckpointCellStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "SUBMITTED"
  | "LATE"
  | "GRADED";

export interface CourseHomeworkProgress {
  course: { id: string; title: string };
  learners: { id: string; fullName: string }[];
  checkpoints: {
    homeworkId: string;
    moduleItemId: string | null;
    title: string;
    maxPoints: number;
    dueDate: string | null;
    chapter: string | null;
    cells: {
      studentProfileId: string;
      status: CheckpointCellStatus;
      pointsEarned: number | null;
      submittedAt: string | null;
    }[];
  }[];
}

/** A checkpoint brief, carrying where it sits in the course. */
export interface CourseHomework extends Homework {
  moduleItem: {
    id: string;
    title: string;
    sortOrder: number;
    concept: { id: string; name: string; sortOrder: number };
  } | null;
  _count: { submissions: number };
}

export interface CreateHomeworkPayload {
  batchId: string;
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
  /** Ids from uploadHomeworkAttachment — never URLs. */
  attachmentFileIds?: string[];
}

export interface GradeSubmissionPayload {
  submissionId: string;
  pointsEarned: number;
  feedback?: string;
}

/**
 * Where a handed-in file is read from. A plain URL rather than an RTK endpoint:
 * the API answers with a redirect to a short-lived signed URL, or streams the
 * bytes, and neither belongs in the cache.
 */
export function homeworkAttachmentUrl(fileUploadId: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
  return `${apiUrl}/api/homework/attachments/${fileUploadId}`;
}

export const homeworkApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getHomeworkForClass: builder.query<Homework[], string>({
      query: (batchId) => `/homework/batch/${batchId}`,
      providesTags: (result, error, batchId) => [
        { type: "Homework", id: `LIST-${batchId}` },
      ],
    }),

    /**
     * Every checkpoint against every entitled learner, including the ones who
     * have not started — which is the state a teacher is usually looking for.
     */
    getCourseHomeworkProgress: builder.query<CourseHomeworkProgress, string>({
      query: (courseId) => `/homework/course/${courseId}/progress`,
      providesTags: (result, error, courseId) => [
        { type: "Homework", id: `PROGRESS-${courseId}` },
      ],
    }),

    /**
     * Checkpoint homework for a course. Separate from the batch listing
     * because a checkpoint has no batch — it hangs off a chapter — and was
     * therefore invisible to every teacher-facing screen.
     */
    getHomeworkForCourse: builder.query<CourseHomework[], string>({
      query: (courseId) => `/homework/course/${courseId}`,
      providesTags: (result, error, courseId) => [
        { type: "Homework", id: `COURSE-${courseId}` },
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
      invalidatesTags: (result, error, { batchId }) => [
        { type: "Homework", id: `LIST-${batchId}` },
        { type: "Homework", id: "MY-PENDING" },
      ],
    }),

    updateHomework: builder.mutation<Homework, UpdateHomeworkPayload>({
      query: ({ id, ...body }) => ({
        url: `/homework/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Homework" }],
    }),

    /**
     * Stores one file privately and returns its id. Multipart, so the body is
     * a FormData and fetchBaseQuery leaves Content-Type to the browser.
     */
    uploadHomeworkAttachment: builder.mutation<
      { id: string; originalName: string; size: number; mimetype: string },
      File
    >({
      query: (file) => {
        const body = new FormData();
        body.append("file", file);
        return { url: "/homework/attachments", method: "POST", body };
      },
    }),
    submitHomework: builder.mutation<HomeworkSubmission, SubmitHomeworkPayload>({
      query: (body) => ({
        url: "/homework/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Homework" }],
    }),

    gradeHomeworkSubmission: builder.mutation<HomeworkSubmission, GradeSubmissionPayload>({
      query: ({ submissionId, ...body }) => ({
        url: `/homework/submissions/${submissionId}/grade`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Homework" }],
    }),

    getBatchById: builder.query<any, string>({
      query: (id) => `/batches/${id}`,
    }),
  }),
});

export const {
  useGetHomeworkForClassQuery,
  useGetHomeworkForCourseQuery,
  useGetCourseHomeworkProgressQuery,
  useGetHomeworkSubmissionsQuery,
  useGetStudentSubmissionsQuery,
  useGetStudentPendingHomeworkQuery,
  useGetMyPendingHomeworkQuery,
  useCreateHomeworkMutation,
  useUpdateHomeworkMutation,
  useSubmitHomeworkMutation,
  useUploadHomeworkAttachmentMutation,
  useGradeHomeworkSubmissionMutation,
  useGetBatchByIdQuery,
} = homeworkApi;
