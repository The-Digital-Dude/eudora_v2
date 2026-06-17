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

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  source: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseClass {
  id: string;
  termId: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  term?: {
    id: string;
    name: string;
    academicYear?: {
      id: string;
      name: string;
    };
  };
}

export interface ClassSection {
  id: string;
  programId: string;
  academicYearId: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface MakeupRequest {
  id: string;
  studentProfileId: string;
  courseClassId: string;
  originalDate: string;
  reason?: string;
  status: string;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
  studentProfile?: {
    id: string;
    fullName: string;
  };
  courseClass?: {
    id: string;
    name: string;
  };
}

export interface AssessmentAttempt {
  id: string;
  assessmentAssignmentId: string;
  studentProfileId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
  rawScore?: number;
  maxScore?: number;
  percentageScore?: number;
  resultStatus: string;
  createdAt: string;
  updatedAt: string;
  studentProfile?: {
    id: string;
    fullName: string;
  };
  assignment?: {
    id: string;
    assessment?: {
      id: string;
      title: string;
      subject?: {
        name: string;
      };
    };
  };
}

export interface Broadcast {
  id: string;
  type: string;
  title: string;
  content?: string;
  sender: string;
  status: string;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "GRADUATED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
  placements?: {
    classSectionId: string;
    academicYearId: string;
    classSection?: {
      id: string;
      name: string;
      code: string;
    };
  }[];
  enrollments?: {
    id: string;
    courseClassId: string;
    courseClass?: {
      id: string;
      name: string;
      code: string;
    };
  }[];
}

export interface StudentPlacement {
  studentProfileId: string;
  classSectionId: string;
  academicYearId: string;
  status: "PLACED" | "PENDING" | "WITHDRAWN";
  isActive: boolean;
  createdAt?: string;
}

export interface StudentEnrollment {
  id: string;
  studentProfileId: string;
  courseClassId: string;
  enrollmentDate: string;
  status: "ENROLLED" | "COMPLETED" | "DROPPED";
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "INACTIVE";
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

    getLeads: builder.query<{ items: Lead[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/leads?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["Leads"],
    } as any),
    createLead: builder.mutation<Lead, Partial<Lead>>({
      query: (body: any) => ({
        url: "/leads",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Leads"],
    } as any),
    updateLead: builder.mutation<Lead, { id: string; body: Partial<Lead> }>({
      query: ({ id, body }: any) => ({
        url: `/leads/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Leads"],
    } as any),
    deleteLead: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/leads/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Leads"],
    } as any),

    getCourseClasses: builder.query<{ items: CourseClass[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/course-classes?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["CourseClasses"],
    } as any),

    getClassSections: builder.query<{ items: ClassSection[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/class-sections?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["ClassSections"],
    } as any),

    getAcademicYears: builder.query<{ items: AcademicYear[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/academic-years?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
    } as any),

    getMakeupRequests: builder.query<{ items: MakeupRequest[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/makeup-requests?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["MakeupRequests"],
    } as any),
    updateMakeupRequest: builder.mutation<MakeupRequest, { id: string; body: { status: string; scheduledDate?: string } }>({
      query: ({ id, body }: any) => ({
        url: `/makeup-requests/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["MakeupRequests"],
    } as any),

    getAssessmentAttempts: builder.query<{ items: AssessmentAttempt[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/attempts?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["Attempts"],
    } as any),

    getBroadcasts: builder.query<{ items: Broadcast[]; total: number }, { page?: number; limit?: number } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/communication/broadcasts?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["Broadcasts"],
    } as any),
    createBroadcast: builder.mutation<Broadcast, Partial<Broadcast>>({
      query: (body: any) => ({
        url: "/communication/broadcasts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Broadcasts"],
    } as any),

    getStudentProfiles: builder.query<{ items: StudentProfile[]; total: number }, { page?: number; limit?: number; status?: string } | void>({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const statusQuery = params?.status ? `&status=${params.status}` : "";
        return `/student-profiles?page=${page}&limit=${limit}${statusQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? (response.data?.length ?? 0),
      }),
      providesTags: ["Students"],
    } as any),
    createStudentProfile: builder.mutation<StudentProfile, Partial<StudentProfile>>({
      query: (body: any) => ({
        url: "/student-profiles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Students"],
    } as any),
    updateStudentProfile: builder.mutation<StudentProfile, { id: string; body: Partial<StudentProfile> }>({
      query: ({ id, body }: any) => ({
        url: `/student-profiles/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Students"],
    } as any),
    deleteStudentProfile: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/student-profiles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Students"],
    } as any),

    createStudentPlacement: builder.mutation<StudentPlacement, { studentProfileId: string; classSectionId: string; academicYearId: string }>({
      query: (body: any) => ({
        url: "/student-placements",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Students", "Placements"],
    } as any),
    deleteStudentPlacement: builder.mutation<void, { studentProfileId: string; classSectionId: string }>({
      query: ({ studentProfileId, classSectionId }: any) => ({
        url: `/student-placements/${studentProfileId}/${classSectionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Students", "Placements"],
    } as any),

    createStudentEnrollment: builder.mutation<StudentEnrollment, { studentProfileId: string; courseClassId: string }>({
      query: (body: any) => ({
        url: "/student-enrollments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Students", "Enrollments"],
    } as any),
    deleteStudentEnrollment: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/student-enrollments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Students", "Enrollments"],
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
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useGetCourseClassesQuery,
  useGetClassSectionsQuery,
  useGetAcademicYearsQuery,
  useGetMakeupRequestsQuery,
  useUpdateMakeupRequestMutation,
  useGetAssessmentAttemptsQuery,
  useGetBroadcastsQuery,
  useCreateBroadcastMutation,
  useGetStudentProfilesQuery,
  useCreateStudentProfileMutation,
  useUpdateStudentProfileMutation,
  useDeleteStudentProfileMutation,
  useCreateStudentPlacementMutation,
  useDeleteStudentPlacementMutation,
  useCreateStudentEnrollmentMutation,
  useDeleteStudentEnrollmentMutation,
} = dashboardApi;
