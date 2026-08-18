import { authApi } from "../auth/authApi";

export interface TeacherClassOverview {
  classSectionId: string;
  name: string;
  code: string;
  rosterCount: number;
  isAttendanceMarkedToday: boolean;
}

export interface TeacherPerformanceAlert {
  studentProfileId: string;
  fullName: string;
  classSectionName: string;
  reason: "LOW_ATTENDANCE" | "LOW_GRADE";
  metric: string;
}

/** A cohort on the commerce spine — the batch counterpart to TeacherClassOverview. */
export interface TeacherBatchOverview {
  batchId: string;
  name: string;
  code: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  course: { id: string; title: string; deliveryMode: string } | null;
  enrolledCount: number;
  /** LEAD = leads this cohort; COURSE_TEACHER = assigned to its course. */
  role: "LEAD" | "COURSE_TEACHER";
  nextSession: {
    id: string;
    topic: string | null;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
    joinUrl: string | null;
    /** Host link — teacher-only, starts the meeting. */
    startUrl: string | null;
    moduleItem: { id: string; title: string } | null;
  } | null;
}

export const teacherPortalApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getTeacherClasses: builder.query<TeacherClassOverview[], void>({
      query: () => "/teacher/classes",
      providesTags: ["TeacherPortal"],
    }),
    getTeacherBatches: builder.query<TeacherBatchOverview[], void>({
      query: () => "/teacher/batches",
      providesTags: ["TeacherPortal"],
    }),
    getTeacherAlerts: builder.query<TeacherPerformanceAlert[], void>({
      query: () => "/teacher/alerts",
      providesTags: ["TeacherPortal"],
    }),
  }),
});

export const {
  useGetTeacherClassesQuery,
  useGetTeacherBatchesQuery,
  useGetTeacherAlertsQuery,
} = teacherPortalApi;
