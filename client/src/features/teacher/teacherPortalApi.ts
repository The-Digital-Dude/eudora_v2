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

export const teacherPortalApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getTeacherClasses: builder.query<TeacherClassOverview[], void>({
      query: () => "/teacher/classes",
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
  useGetTeacherAlertsQuery,
} = teacherPortalApi;
