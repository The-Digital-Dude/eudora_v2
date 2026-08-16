import { authApi } from "../auth/authApi";

export type PlacementRecStatus = "SUGGESTED" | "ACCEPTED" | "OVERRIDDEN";

export interface PlacementRecommendation {
  id: string;
  studentProfileId: string | null;
  leadId: string | null;
  assessmentAttemptId: string;
  recommendedClassId: string;
  recommendedClassSectionId: string | null;
  rationale: string;
  status: PlacementRecStatus;
  decidedById: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studentProfile: { id: string; fullName: string } | null;
  recommendedClass: { id: string; name: string };
  recommendedClassSection: { id: string; name: string } | null;
}

export interface ListPlacementRecommendationsParams {
  studentProfileId?: string;
  leadId?: string;
  status?: PlacementRecStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface DecidePlacementPayload {
  id: string;
  status: Extract<PlacementRecStatus, "ACCEPTED" | "OVERRIDDEN">;
  note?: string;
}

export const placementRecommendationsApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    listPlacementRecommendations: builder.query<
      { items: PlacementRecommendation[]; total: number },
      ListPlacementRecommendationsParams | void
    >({
      query: (params) => ({ url: "/diagnostics/placements", params: params ?? undefined }),
      providesTags: ["PlacementRecommendations"],
    }),

    decidePlacementRecommendation: builder.mutation<PlacementRecommendation, DecidePlacementPayload>({
      query: ({ id, ...body }) => ({
        url: `/diagnostics/placements/${id}/decision`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PlacementRecommendations"],
    }),
  }),
});

export const {
  useListPlacementRecommendationsQuery,
  useDecidePlacementRecommendationMutation,
} = placementRecommendationsApi;
