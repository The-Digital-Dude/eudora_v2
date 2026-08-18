import { authApi } from "../auth/authApi";

/**
 * A live class is a `BatchSession` — the meeting one cohort attends. The
 * curriculum slot it fulfils (if any) is a `ModuleItem` of kind LIVE_CLASS,
 * exposed here as `moduleItem`.
 */
export interface LiveClassSession {
  id: string;
  batchId: string;
  moduleItemId?: string | null;
  teacherUserId?: string | null;
  topic: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  provider: "NONE" | "ZOOM";
  externalMeetingId?: string | null;
  joinUrl?: string | null;
  startUrl?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  batch?: { id: string; name: string; code: string };
  moduleItem?: { id: string; title: string } | null;
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

export interface ScheduleLiveClassBody {
  batchId: string;
  moduleItemId?: string;
  topic?: string;
  startTime: string;
  endTime: string;
}

export interface RescheduleLiveClassBody {
  topic?: string;
  startTime?: string;
  endTime?: string;
}

export interface ListLiveClassesParams {
  batchId?: string;
  moduleItemId?: string;
  teacherUserId?: string;
  status?: LiveClassSession["status"];
  from?: string;
  to?: string;
}

export const liveClassesApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getLiveClasses: builder.query<LiveClassSession[], ListLiveClassesParams | void>({
      query: (params) => {
        const queryParts: string[] = [];
        if (params?.batchId) queryParts.push(`batchId=${params.batchId}`);
        if (params?.moduleItemId) queryParts.push(`moduleItemId=${params.moduleItemId}`);
        if (params?.teacherUserId) queryParts.push(`teacherUserId=${params.teacherUserId}`);
        if (params?.status) queryParts.push(`status=${params.status}`);
        if (params?.from) queryParts.push(`from=${params.from}`);
        if (params?.to) queryParts.push(`to=${params.to}`);
        const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
        return `/live-classes${queryString}`;
      },
      providesTags: ["LiveClasses" as any],
    }),

    getLiveClassById: builder.query<LiveClassSession, string>({
      query: (id) => `/live-classes/${id}`,
      providesTags: (result, error, id) => [{ type: "LiveClasses" as any, id }],
    }),

    scheduleLiveClass: builder.mutation<LiveClassSession, ScheduleLiveClassBody>({
      query: (body) => ({
        url: "/live-classes",
        method: "POST",
        body,
      }),
      invalidatesTags: ["LiveClasses" as any],
    }),

    rescheduleLiveClass: builder.mutation<
      LiveClassSession,
      { id: string; body: RescheduleLiveClassBody }
    >({
      query: ({ id, body }) => ({
        url: `/live-classes/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["LiveClasses" as any],
    }),

    cancelLiveClass: builder.mutation<LiveClassSession, string>({
      query: (id) => ({
        url: `/live-classes/${id}/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: ["LiveClasses" as any],
    }),

    startLiveClass: builder.mutation<LiveClassSession, string>({
      query: (id) => ({
        url: `/live-classes/${id}/start`,
        method: "PATCH",
      }),
      invalidatesTags: ["LiveClasses" as any],
    }),

    endLiveClass: builder.mutation<LiveClassSession, string>({
      query: (id) => ({
        url: `/live-classes/${id}/end`,
        method: "PATCH",
      }),
      invalidatesTags: ["LiveClasses" as any],
    }),
  }),
});

export const {
  useGetLiveClassesQuery,
  useGetLiveClassByIdQuery,
  useScheduleLiveClassMutation,
  useRescheduleLiveClassMutation,
  useCancelLiveClassMutation,
  useStartLiveClassMutation,
  useEndLiveClassMutation,
} = liveClassesApi;
