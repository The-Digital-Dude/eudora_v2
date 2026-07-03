import { authApi } from "../auth/authApi";

export type NextActionType = "REVIEW" | "REASSESS" | "INTERVENTION" | "PRACTICE";
export type NextActionStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export interface NextAction {
  id: string;
  gapId: string | null;
  studentProfileId: string;
  competencyId: string;
  actionType: NextActionType;
  reason: string;
  ownerUserId: string;
  dueDate: string;
  reassessmentPlan: string | null;
  status: NextActionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  studentProfile: { id: string; fullName: string };
  competency: { id: string; name: string };
  owner: { id: string; firstName: string; lastName: string };
}

export interface ListNextActionsParams {
  ownerUserId?: string;
  studentProfileId?: string;
  status?: NextActionStatus;
}

export interface CreateNextActionPayload {
  gapId?: string;
  studentProfileId: string;
  competencyId: string;
  actionType: NextActionType;
  reason: string;
  ownerUserId: string;
  dueDate: string;
  reassessmentPlan?: string;
}

export interface UpdateNextActionPayload {
  id: string;
  status?: NextActionStatus;
  dueDate?: string;
  reassessmentPlan?: string;
}

export const nextActionsApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    listNextActions: builder.query<NextAction[], ListNextActionsParams | void>({
      query: (params) => ({ url: "/next-actions", params: params ?? undefined }),
      providesTags: ["NextActions"],
    }),

    createNextAction: builder.mutation<NextAction, CreateNextActionPayload>({
      query: (body) => ({
        url: "/next-actions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["NextActions", "LearningGaps"],
    }),

    updateNextAction: builder.mutation<NextAction, UpdateNextActionPayload>({
      query: ({ id, ...body }) => ({
        url: `/next-actions/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["NextActions"],
    }),
  }),
});

export const {
  useListNextActionsQuery,
  useCreateNextActionMutation,
  useUpdateNextActionMutation,
} = nextActionsApi;
