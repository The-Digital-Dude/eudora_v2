import { authApi } from "../auth/authApi";

export type GapSeverity = "LOW" | "MEDIUM" | "HIGH";
export type GapStatus = "OPEN" | "ADDRESSING" | "RESOLVED";

export interface LearningGap {
  id: string;
  studentProfileId: string;
  competencyId: string;
  severity: GapSeverity;
  rootCause: string;
  status: GapStatus;
  detectedFrom: string;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  studentProfile: { id: string; fullName: string };
  competency: { id: string; name: string };
  nextActions: { id: string; status: string }[];
}

export interface ListGapsParams {
  studentProfileId?: string;
  competencyId?: string;
  status?: GapStatus;
}

export const learningGapsApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    listGaps: builder.query<LearningGap[], ListGapsParams | void>({
      query: (params) => ({ url: "/gaps", params: params ?? undefined }),
      providesTags: ["LearningGaps"],
    }),

    updateGapStatus: builder.mutation<LearningGap, { id: string; status: GapStatus }>({
      query: ({ id, status }) => ({
        url: `/gaps/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["LearningGaps"],
    }),
  }),
});

export const { useListGapsQuery, useUpdateGapStatusMutation } = learningGapsApi;
