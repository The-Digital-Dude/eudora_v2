import { authApi } from "../auth/authApi";

/**
 * What used to be the Timetable API.
 *
 * `Timetable` and `TimetableSlot` were retired: the weekly recurrence they
 * expressed now lives on `Batch.meetingDays`, and the schedule reads resolved
 * through `StudentClassPlacement`, so they returned nothing for any student who
 * arrived through guardian checkout. Schedules now come from `BatchSession`.
 *
 * Terms and the teacher-me lookup stayed because other screens depend on them
 * and neither had anything to do with the timetable.
 */

/** One real meeting, replacing the old weekly slot. */
export interface ScheduledSession {
  id: string;
  batchId: string;
  topic: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  joinUrl: string | null;
  batch?: { id: string; name: string; code: string };
  moduleItem?: { id: string; title: string } | null;
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

export const timetableApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getTerms: builder.query<
      { items: any[]; total: number },
      { academicYearId?: string; page?: number; limit?: number } | void
    >({
      query: (params: any) => {
        const q = new URLSearchParams();
        if (params?.academicYearId) q.set("academicYearId", params.academicYearId);
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        const query = q.toString();
        return `/terms${query ? `?${query}` : ""}`;
      },
      transformResponse: (response: any) => ({
        items: response?.data ?? response?.items ?? [],
        total: response?.meta?.total ?? response?.data?.length ?? 0,
      }),
    } as any),

    getTeacherMe: builder.query<any, void>({
      query: () => "/teacher-profiles/me",
    } as any),

    getStudentSchedule: builder.query<
      ScheduledSession[],
      { studentProfileId: string; from?: string; to?: string }
    >({
      query: ({ studentProfileId, from, to }: any) => {
        const q = new URLSearchParams();
        if (from) q.set("from", from);
        if (to) q.set("to", to);
        const query = q.toString();
        return `/schedule/student/${studentProfileId}${query ? `?${query}` : ""}`;
      },
      providesTags: ["BatchSessions" as any],
    } as any),

    getTeacherSchedule: builder.query<
      ScheduledSession[],
      { teacherProfileId: string; from?: string; to?: string }
    >({
      query: ({ teacherProfileId, from, to }: any) => {
        const q = new URLSearchParams();
        if (from) q.set("from", from);
        if (to) q.set("to", to);
        const query = q.toString();
        return `/schedule/teacher/${teacherProfileId}${query ? `?${query}` : ""}`;
      },
      providesTags: ["BatchSessions" as any],
    } as any),
  }),
});

export const {
  useGetTermsQuery,
  useGetTeacherMeQuery,
  useGetStudentScheduleQuery,
  useGetTeacherScheduleQuery,
} = timetableApi;
