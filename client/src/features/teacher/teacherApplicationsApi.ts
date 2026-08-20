import { authApi } from "../auth/authApi";

export type TeacherApplicationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

/** What an applicant sees about their own application — no reviewer notes. */
export interface MyTeacherApplication {
  id: string;
  status: TeacherApplicationStatus;
  fullName: string;
  phone: string | null;
  specialization: string | null;
  yearsExperience: number | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

/** The reviewer's view, which additionally carries who applied and their CV. */
export interface TeacherApplication extends MyTeacherApplication {
  reviewNotes: string | null;
  user: { id: string; email: string };
  resumeFile: { id: string; originalName: string; size: number };
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface TeacherApplicationInput {
  fullName: string;
  phone?: string;
  specialization?: string;
  yearsExperience?: number;
  bio?: string;
  resume: File;
}

export const teacherApplicationsApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Multipart, because the CV travels with the fields. The body is a
     * FormData, so fetchBaseQuery leaves Content-Type unset and lets the
     * browser add the multipart boundary — setting it by hand produces a
     * boundary-less header the server cannot parse.
     */
    submitTeacherApplication: builder.mutation<
      MyTeacherApplication,
      TeacherApplicationInput
    >({
      query: ({ resume, ...fields }) => {
        const body = new FormData();
        body.append("resume", resume);
        Object.entries(fields).forEach(([key, value]) => {
          if (value !== undefined && value !== "") {
            body.append(key, String(value));
          }
        });
        return { url: "/teacher-applications", method: "POST", body };
      },
      invalidatesTags: ["TeacherApplications"],
    }),

    /** Null when this account has never applied. */
    getMyTeacherApplication: builder.query<MyTeacherApplication | null, void>({
      query: () => "/teacher-applications/me",
      providesTags: ["TeacherApplications"],
    }),

    getTeacherApplications: builder.query<
      { items: TeacherApplication[]; total: number },
      { page?: number; limit?: number; status?: TeacherApplicationStatus } | void
    >({
      query: (params) => ({
        url: "/teacher-applications",
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          ...(params?.status ? { status: params.status } : {}),
        },
      }),
      providesTags: ["TeacherApplications"],
    }),

    reviewTeacherApplication: builder.mutation<
      TeacherApplication,
      {
        id: string;
        status: Exclude<TeacherApplicationStatus, "PENDING">;
        reviewNotes?: string;
        employeeCode?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/teacher-applications/${id}`,
        method: "PATCH",
        body,
      }),
      // Approving mints a TEACHER role and profile, so the teacher list is
      // stale the moment this succeeds.
      invalidatesTags: ["TeacherApplications", "Teachers", "Users"],
    }),
  }),
});

export const {
  useSubmitTeacherApplicationMutation,
  useGetMyTeacherApplicationQuery,
  useGetTeacherApplicationsQuery,
  useReviewTeacherApplicationMutation,
} = teacherApplicationsApi;

/**
 * Where a reviewer opens a CV. A plain link rather than an RTK endpoint: the
 * response is a redirect to a signed URL (or the PDF itself), neither of which
 * belongs in the cache. `credentials: include` happens because the browser
 * treats this as a normal top-level navigation to the API origin.
 */
export function teacherApplicationResumeUrl(id: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
  return `${apiUrl}/api/teacher-applications/${id}/resume`;
}
