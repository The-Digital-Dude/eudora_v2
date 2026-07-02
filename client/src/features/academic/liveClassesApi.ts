import { authApi } from "../auth/authApi";

export interface LiveClassSession {
  id: string;
  classSectionId: string;
  teacherUserId: string;
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  provider: "NONE" | "ZOOM";
  externalMeetingId?: string | null;
  joinUrl?: string | null;
  startUrl?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  classSection?: { id: string; name: string; code: string };
  teacher?: { id: string; firstName: string; lastName: string };
}

export interface ScheduleLiveClassBody {
  classSectionId: string;
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
}

export interface RescheduleLiveClassBody {
  title?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
}

export interface ListLiveClassesParams {
  classSectionId?: string;
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
        if (params?.classSectionId) queryParts.push(`classSectionId=${params.classSectionId}`);
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
