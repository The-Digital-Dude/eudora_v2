import { authApi } from "../auth/authApi";

export interface TimetableSlot {
  id: string;
  timetableId: string;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  periodIndex: number;
  startTimeMinutes: number;
  endTimeMinutes: number;
  room?: string | null;
  classSectionId: string;
  courseClassId?: string | null;
  teacherProfileId?: string | null;
  status: "ACTIVE" | "CANCELLED";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  courseClass?: {
    id: string;
    name: string;
    code: string;
  };
  teacherProfile?: {
    id: string;
    fullName: string;
  };
  classSection?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface Timetable {
  id: string;
  academicYearId: string;
  termId?: string | null;
  classSectionId?: string | null;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdById?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  slots?: TimetableSlot[];
}

export interface TimetableConflict {
  type: "TEACHER" | "CLASS_SECTION" | "ROOM" | "INVALID_TIME";
  message: string;
  slotIndex?: number;
  conflictingSlotId?: string;
  conflictingTimetableId?: string;
  dayOfWeek: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
}

export const timetableApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getTerms: builder.query<
      { items: any[]; total: number },
      { academicYearId?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const yearQuery = params?.academicYearId ? `&academicYearId=${params.academicYearId}` : "";
        return `/terms?page=${page}&limit=${limit}${yearQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
    }),

    getTeacherMe: builder.query<any, void>({
      query: () => "/teacher-profiles/me",
    }),

    getTimetables: builder.query<
      Timetable[],
      {
        academicYearId?: string;
        termId?: string;
        classSectionId?: string;
        status?: string;
      } | void
    >({
      query: (params) => {
        const queryParts = [];
        if (params?.academicYearId) queryParts.push(`academicYearId=${params.academicYearId}`);
        if (params?.termId) queryParts.push(`termId=${params.termId}`);
        if (params?.classSectionId) queryParts.push(`classSectionId=${params.classSectionId}`);
        if (params?.status) queryParts.push(`status=${params.status}`);
        const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
        return `/timetables${queryString}`;
      },
      providesTags: ["Timetables" as any],
    }),

    getTimetableById: builder.query<Timetable, string>({
      query: (id) => `/timetables/${id}`,
      providesTags: (result, error, id) => [{ type: "Timetables" as any, id }],
    }),

    createTimetable: builder.mutation<Timetable, Partial<Timetable>>({
      query: (body) => ({
        url: "/timetables",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Timetables" as any],
    }),

    updateTimetable: builder.mutation<Timetable, { id: string; body: Partial<Timetable> }>({
      query: ({ id, body }) => ({
        url: `/timetables/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Timetables" as any,
        { type: "Timetables" as any, id },
      ],
    }),

    deleteTimetable: builder.mutation<void, string>({
      query: (id) => ({
        url: `/timetables/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Timetables" as any],
    }),

    publishTimetable: builder.mutation<Timetable, string>({
      query: (id) => ({
        url: `/timetables/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        "Timetables" as any,
        { type: "Timetables" as any, id },
      ],
    }),

    createTimetableSlot: builder.mutation<
      TimetableSlot,
      { timetableId: string; body: Partial<TimetableSlot> }
    >({
      query: ({ timetableId, body }) => ({
        url: `/timetables/${timetableId}/slots`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { timetableId }) => [
        { type: "Timetables" as any, id: timetableId },
        "TimetableSlots" as any,
      ],
    }),

    updateTimetableSlot: builder.mutation<
      TimetableSlot,
      { timetableId: string; slotId: string; body: Partial<TimetableSlot> }
    >({
      query: ({ timetableId, slotId, body }) => ({
        url: `/timetables/${timetableId}/slots/${slotId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { timetableId }) => [
        { type: "Timetables" as any, id: timetableId },
        "TimetableSlots" as any,
      ],
    }),

    deleteTimetableSlot: builder.mutation<void, { timetableId: string; slotId: string }>({
      query: ({ timetableId, slotId }) => ({
        url: `/timetables/${timetableId}/slots/${slotId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { timetableId }) => [
        { type: "Timetables" as any, id: timetableId },
        "TimetableSlots" as any,
      ],
    }),

    bulkUpsertTimetableSlots: builder.mutation<
      TimetableSlot[],
      { timetableId: string; slots: Partial<TimetableSlot>[] }
    >({
      query: ({ timetableId, slots }) => ({
        url: `/timetables/${timetableId}/slots/bulk-upsert`,
        method: "POST",
        body: { slots },
      }),
      invalidatesTags: (result, error, { timetableId }) => [
        { type: "Timetables" as any, id: timetableId },
        "TimetableSlots" as any,
      ],
    }),

    checkTimetableConflicts: builder.mutation<
      TimetableConflict[],
      { timetableId: string; slots: Partial<TimetableSlot>[] }
    >({
      query: (body) => ({
        url: "/timetables/conflicts",
        method: "POST",
        body,
      }),
    }),

    getStudentSchedule: builder.query<TimetableSlot[], string>({
      query: (studentProfileId) => `/timetables/schedule/student/${studentProfileId}`,
      providesTags: ["TimetableSlots" as any],
    }),

    getTeacherSchedule: builder.query<TimetableSlot[], string>({
      query: (teacherProfileId) => `/timetables/schedule/teacher/${teacherProfileId}`,
      providesTags: ["TimetableSlots" as any],
    }),

    getClassSectionSchedule: builder.query<TimetableSlot[], string>({
      query: (classSectionId) => `/timetables/schedule/class-section/${classSectionId}`,
      providesTags: ["TimetableSlots" as any],
    }),
  }),
});

export const {
  useGetTermsQuery,
  useGetTeacherMeQuery,
  useGetTimetablesQuery,
  useGetTimetableByIdQuery,
  useCreateTimetableMutation,
  useUpdateTimetableMutation,
  useDeleteTimetableMutation,
  usePublishTimetableMutation,
  useCreateTimetableSlotMutation,
  useUpdateTimetableSlotMutation,
  useDeleteTimetableSlotMutation,
  useBulkUpsertTimetableSlotsMutation,
  useCheckTimetableConflictsMutation,
  useGetStudentScheduleQuery,
  useGetTeacherScheduleQuery,
  useGetClassSectionScheduleQuery,
} = timetableApi;
