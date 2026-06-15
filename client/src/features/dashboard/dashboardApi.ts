import { authApi } from "../auth/authApi";

export interface Campus {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  description?: string;
  durationYears: number;
  campusId: string;
  campus?: Campus;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  roles?: {
    id: string;
    userId: string;
    roleId: string;
    role: Role;
  }[];
}

export interface BillingPlan {
  id: string;
  name: string;
  code: string;
  description?: string;
  amount: number;
  currency: string;
  interval: "MONTHLY" | "YEARLY";
  active: boolean;
  stripePriceId?: string;
  stripeProductId?: string;
  createdAt: string;
  updatedAt: string;
}

export const dashboardApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCampuses: builder.query<{ items: Campus[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/campuses?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["Campuses"],
    } as any),
    createCampus: builder.mutation<Campus, Partial<Campus>>({
      query: (body: any) => ({
        url: "/campuses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Campuses"],
    } as any),
    updateCampus: builder.mutation<Campus, { id: string; body: Partial<Campus> }>({
      query: ({ id, body }: any) => ({
        url: `/campuses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Campuses"],
    } as any),
    deleteCampus: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/campuses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Campuses"],
    } as any),

    getPrograms: builder.query<{ items: Program[]; total: number }, { page?: number; limit?: number; campusId?: string } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const campusQuery = params?.campusId ? `&campusId=${params.campusId}` : "";
        return `/programs?page=${page}&limit=${limit}${campusQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["Programs"],
    } as any),
    createProgram: builder.mutation<Program, Partial<Program>>({
      query: (body: any) => ({
        url: "/programs",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Programs"],
    } as any),
    updateProgram: builder.mutation<Program, { id: string; body: Partial<Program> }>({
      query: ({ id, body }: any) => ({
        url: `/programs/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Programs"],
    } as any),
    deleteProgram: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/programs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Programs"],
    } as any),

    getUsers: builder.query<{ items: User[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/users?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["Users"],
    } as any),
    updateUser: builder.mutation<User, { id: string; body: Partial<User> }>({
      query: ({ id, body }: any) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
    } as any),

    assignUserRole: builder.mutation<void, { userId: string; roleId: string }>({
      query: ({ userId, roleId }: any) => ({
        url: `/users/${userId}/roles`,
        method: "POST",
        body: { roleId },
      }),
      invalidatesTags: ["Users"],
    } as any),

    removeUserRole: builder.mutation<void, { userId: string; roleId: string }>({
      query: ({ userId, roleId }: any) => ({
        url: `/users/${userId}/roles/${roleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    } as any),

    getRoles: builder.query<Role[], void>({
      query: () => "/roles",
      providesTags: ["Roles"],
    } as any),

    getBillingPlans: builder.query<BillingPlan[], void>({
      query: () => "/billing/plans",
      providesTags: ["BillingPlans"],
    } as any),
    createBillingPlan: builder.mutation<BillingPlan, Partial<BillingPlan>>({
      query: (body: any) => ({
        url: "/billing/plans",
        method: "POST",
        body,
      }),
      invalidatesTags: ["BillingPlans"],
    } as any),
  }),
});

export const {
  useGetCampusesQuery,
  useCreateCampusMutation,
  useUpdateCampusMutation,
  useDeleteCampusMutation,
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
  useAssignUserRoleMutation,
  useRemoveUserRoleMutation,
  useGetRolesQuery,
  useGetBillingPlansQuery,
  useCreateBillingPlanMutation,
} = dashboardApi;
