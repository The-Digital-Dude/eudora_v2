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
  description?: string;
  // Prisma Decimal fields serialize as strings over JSON — coerce with Number() before doing math.
  priceMonthly: number | string;
  priceAnnual: number | string;
  currency: string;
  isActive: boolean;
  isPublic: boolean;
  features: string[];
  stripeProductId?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  maxStudents?: number | null;
  maxCampuses?: number | null;
  maxPrograms?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampusSubscription {
  id: string;
  campusId: string;
  planId: string;
  plan?: BillingPlan;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID";
  interval: "MONTHLY" | "ANNUAL";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
  canceledAt?: string | null;
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
  /** Free-text grade level ("Grade 10"), not the physical room — that's `classroom`. */
  class?: string | null;
  classroom?: string | null;
  /** Null until an admin tags the section; every section predating the column starts untagged. */
  learningSubjectId?: string | null;
  learningSubject?: { id: string; name: string; code: string } | null;
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
  deletedAt?: string | null;
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

export interface ClassTeacher {
  teacherProfileId: string;
  classSectionId: string;
  role: string;
  assignedAt?: string;
  classSection?: ClassSection;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  fullName: string;
  employeeCode?: string;
  phone?: string;
  specialization?: string;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  joinDate: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  classAssignments?: ClassTeacher[];
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface FileUpload {
  id: string;
  url: string;
  key: string;
  bucket?: string;
  provider: string;
  size: number;
  mimetype: string;
  originalName: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const dashboardApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCampuses: builder.query<
      { items: Campus[]; total: number },
      { page?: number; limit?: number; search?: string; status?: string } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        // Default stays high: the dashboard layout's campus switcher calls this with no arguments
        // and expects the full list, not a page of it.
        const limit = params?.limit ?? 100;
        const searchQuery = params?.search ? `&search=${encodeURIComponent(params.search)}` : "";
        const statusQuery = params?.status ? `&status=${params.status}` : "";
        return `/campuses?page=${page}&limit=${limit}${searchQuery}${statusQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["Campuses"],
    } as any),
    getCampus: builder.query<Campus, string>({
      query: (id: string) => `/campuses/${id}`,
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

    getPrograms: builder.query<
      { items: Program[]; total: number },
      { page?: number; limit?: number; campusId?: string; search?: string } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const campusQuery = params?.campusId ? `&campusId=${params.campusId}` : "";
        const searchQuery = params?.search ? `&search=${encodeURIComponent(params.search)}` : "";
        return `/programs?page=${page}&limit=${limit}${campusQuery}${searchQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["Programs"],
    } as any),
    getProgram: builder.query<Program, string>({
      query: (id: string) => `/programs/${id}`,
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

    getUsers: builder.query<
      { items: User[]; total: number },
      { page?: number; limit?: number; search?: string; role?: string } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const searchQuery = params?.search ? `&search=${encodeURIComponent(params.search)}` : "";
        const roleQuery = params?.role ? `&role=${encodeURIComponent(params.role)}` : "";
        return `/users?page=${page}&limit=${limit}${searchQuery}${roleQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
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
    /**
     * Public, unauthenticated pricing feed — used by the marketing /pricing page.
     * Only returns plans marked isActive + isPublic (see plan.controller.ts).
     */
    getPublicPlans: builder.query<BillingPlan[], void>({
      query: () => "/billing/plans/public",
      providesTags: ["BillingPlans"],
    } as any),
    getBillingPlan: builder.query<BillingPlan, string>({
      query: (id: string) => `/billing/plans/${id}`,
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
    updateBillingPlan: builder.mutation<BillingPlan, { id: string; body: Partial<BillingPlan> }>({
      query: ({ id, body }: any) => ({
        url: `/billing/plans/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["BillingPlans"],
    } as any),
    /** Soft-delete — archives the plan (isActive: false) rather than removing the row. */
    deleteBillingPlan: builder.mutation<BillingPlan, string>({
      query: (id: string) => ({
        url: `/billing/plans/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["BillingPlans"],
    } as any),

    /**
     * Create or refresh the Stripe Product/Price for a plan. Runs automatically
     * on create/update; this is the manual retry when that sync failed.
     */
    syncBillingPlanToStripe: builder.mutation<BillingPlan, string>({
      query: (id: string) => ({
        url: `/billing/plans/${id}/sync-stripe`,
        method: "POST",
      }),
      invalidatesTags: ["BillingPlans"],
    } as any),

    /**
     * Start a Stripe Checkout session for a paid plan.
     * Returns a hosted Checkout URL — redirect the browser to it.
     */
    createCheckoutSession: builder.mutation<
      { sessionId: string; url: string | null },
      { campusId: string; planId: string; interval?: "MONTHLY" | "ANNUAL" }
    >({
      query: (body: any) => ({
        url: "/billing/subscriptions/checkout-session",
        method: "POST",
        body,
      }),
    } as any),

    /**
     * Open the Stripe Billing Portal (update card, invoices, cancel).
     * Returns a hosted portal URL — redirect the browser to it.
     */
    createBillingPortalSession: builder.mutation<{ url: string }, string>({
      query: (campusId: string) => ({
        url: `/billing/subscriptions/campus/${campusId}/portal-session`,
        method: "POST",
      }),
    } as any),

    getCampusSubscription: builder.query<CampusSubscription, string>({
      query: (campusId: string) => `/billing/subscriptions/campus/${campusId}`,
      providesTags: ["CampusSubscription"],
    } as any),

    getLeads: builder.query<
      { items: Lead[]; total: number },
      { page?: number; limit?: number; search?: string; status?: string } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const searchQuery = params?.search ? `&search=${encodeURIComponent(params.search)}` : "";
        const statusQuery = params?.status ? `&status=${encodeURIComponent(params.status)}` : "";
        return `/leads?page=${page}&limit=${limit}${searchQuery}${statusQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["Leads"],
    } as any),
    getLead: builder.query<Lead, string>({
      query: (id: string) => `/leads/${id}`,
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

    getCourseClasses: builder.query<
      { items: CourseClass[]; total: number },
      { page?: number; limit?: number } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/course-classes?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["CourseClasses"],
    } as any),

    getClassSections: builder.query<
      { items: ClassSection[]; total: number },
      | {
          page?: number;
          limit?: number;
          /** Pass "none" to list only sections that have no subject tagged yet. */
          learningSubjectId?: string;
          search?: string;
        }
      | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const subjectQuery = params?.learningSubjectId
          ? `&learningSubjectId=${encodeURIComponent(params.learningSubjectId)}`
          : "";
        const searchQuery = params?.search ? `&search=${encodeURIComponent(params.search)}` : "";
        return `/class-sections?page=${page}&limit=${limit}${subjectQuery}${searchQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["ClassSections"],
    } as any),

    getClassSection: builder.query<ClassSection, string>({
      query: (id: any) => `/class-sections/${id}`,
      providesTags: ["ClassSections"],
    } as any),
    createClassSection: builder.mutation<ClassSection, Partial<ClassSection>>({
      query: (body: any) => ({
        url: "/class-sections",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClassSections"],
    } as any),
    updateClassSection: builder.mutation<
      ClassSection,
      { id: string; body: Partial<ClassSection> }
    >({
      query: ({ id, body }: any) => ({
        url: `/class-sections/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ClassSections"],
    } as any),
    deleteClassSection: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/class-sections/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ClassSections"],
    } as any),

    getAcademicYears: builder.query<
      { items: AcademicYear[]; total: number },
      { page?: number; limit?: number } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/academic-years?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
    } as any),

    getMakeupRequests: builder.query<
      { items: MakeupRequest[]; total: number },
      { page?: number; limit?: number } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/makeup-requests?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["MakeupRequests"],
    } as any),
    updateMakeupRequest: builder.mutation<
      MakeupRequest,
      { id: string; body: { status: string; scheduledDate?: string } }
    >({
      query: ({ id, body }: any) => ({
        url: `/makeup-requests/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["MakeupRequests"],
    } as any),

    getAssessmentAttempts: builder.query<
      { items: AssessmentAttempt[]; total: number },
      { page?: number; limit?: number } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/attempts?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["Attempts"],
    } as any),

    getBroadcasts: builder.query<
      { items: Broadcast[]; total: number },
      { page?: number; limit?: number } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        return `/communication/broadcasts?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
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

    getStudentProfiles: builder.query<
      {
        items: StudentProfile[];
        total: number;
        /** Roster-wide counts from the server, independent of the current page and filters. */
        stats: { placedStudents: number; enrollmentTotal: number };
      },
      | {
          page?: number;
          limit?: number;
          status?: string;
          includeArchived?: boolean;
          search?: string;
        }
      | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 100;
        const statusQuery = params?.status ? `&status=${params.status}` : "";
        const archivedQuery = params?.includeArchived
          ? "&includeArchived=true"
          : "";
        const searchQuery = params?.search ? `&search=${encodeURIComponent(params.search)}` : "";
        return `/student-profiles?page=${page}&limit=${limit}${statusQuery}${archivedQuery}${searchQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
        stats: {
          placedStudents: response.meta?.stats?.placedStudents ?? 0,
          enrollmentTotal: response.meta?.stats?.enrollmentTotal ?? 0,
        },
      }),
      providesTags: ["Students"],
    } as any),
    getStudentProfile: builder.query<StudentProfile, string>({
      query: (id: string) => `/student-profiles/${id}`,
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
    updateStudentProfile: builder.mutation<
      StudentProfile,
      { id: string; body: Partial<StudentProfile> }
    >({
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
    restoreStudentProfile: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/student-profiles/${id}/restore`,
        method: "POST",
      }),
      invalidatesTags: ["Students"],
    } as any),

    createStudentPlacement: builder.mutation<
      StudentPlacement,
      { studentProfileId: string; classSectionId: string; academicYearId: string }
    >({
      query: (body: any) => ({
        url: "/student-placements",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Students", "Placements"],
    } as any),
    deleteStudentPlacement: builder.mutation<
      void,
      { studentProfileId: string; classSectionId: string }
    >({
      query: ({ studentProfileId, classSectionId }: any) => ({
        url: `/student-placements/${studentProfileId}/${classSectionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Students", "Placements"],
    } as any),

    createStudentEnrollment: builder.mutation<
      StudentEnrollment,
      { studentProfileId: string; courseClassId: string }
    >({
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
    createGuardianProfile: builder.mutation<
      any,
      { fullName: string; phone?: string; email?: string }
    >({
      query: (body: any) => ({
        url: "/guardian-profiles",
        method: "POST",
        body,
      }),
    } as any),
    selfLinkGuardian: builder.mutation<any, { studentEmail: string; relationshipType?: string }>({
      query: (body: any) => ({
        url: "/guardian-relationships/self-link",
        method: "POST",
        body,
      }),
    } as any),

    getTeacherProfiles: builder.query<
      { items: TeacherProfile[]; total: number },
      { page?: number; limit?: number; status?: string; search?: string } | void
    >({
      query: (params: any) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 10;
        const statusQuery = params?.status ? `&status=${params.status}` : "";
        const searchQuery = params?.search ? `&search=${encodeURIComponent(params.search)}` : "";
        return `/teacher-profiles?page=${page}&limit=${limit}${statusQuery}${searchQuery}`;
      },
      transformResponse: (response: any) => ({
        items: response.data || [],
        total: response.meta?.total ?? response.data?.length ?? 0,
      }),
      providesTags: ["Teachers"],
    } as any),
    getTeacherProfile: builder.query<TeacherProfile, string>({
      query: (id: string) => `/teacher-profiles/${id}`,
      providesTags: ["Teachers"],
    } as any),
    createTeacherProfile: builder.mutation<TeacherProfile, any>({
      query: (body: any) => ({
        url: "/teacher-profiles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Teachers"],
    } as any),
    updateTeacherProfile: builder.mutation<
      TeacherProfile,
      { id: string; body: Partial<TeacherProfile> }
    >({
      query: ({ id, body }: any) => ({
        url: `/teacher-profiles/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Teachers"],
    } as any),
    deleteTeacherProfile: builder.mutation<void, string>({
      query: (id: any) => ({
        url: `/teacher-profiles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teachers"],
    } as any),
    assignTeacherClass: builder.mutation<
      void,
      { id: string; classSectionId: string; role?: string }
    >({
      query: ({ id, classSectionId, role }: any) => ({
        url: `/teacher-profiles/${id}/classes`,
        method: "POST",
        body: { classSectionId, role },
      }),
      invalidatesTags: ["Teachers"],
    } as any),
    removeTeacherClass: builder.mutation<void, { id: string; classSectionId: string }>({
      query: ({ id, classSectionId }: any) => ({
        url: `/teacher-profiles/${id}/classes/${classSectionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teachers"],
    } as any),

    getNotifications: builder.query<any[], void>({
      query: () => "/notifications",
      providesTags: ["Notifications"],
    } as any),
    getUnreadNotificationsCount: builder.query<{ count: number }, void>({
      query: () => "/notifications/unread-count",
      providesTags: ["Notifications"],
    } as any),
    markNotificationAsRead: builder.mutation<void, string>({
      query: (id: string) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    } as any),
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/notifications/read-all",
        method: "POST",
      }),
      invalidatesTags: ["Notifications"],
    } as any),
    deleteNotification: builder.mutation<void, string>({
      query: (id: string) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    } as any),
    uploadFile: builder.mutation<FileUpload, FormData>({
      query: (formData: FormData) => ({
        url: "/uploads",
        method: "POST",
        body: formData,
      }),
    } as any),
    getDashboardSnapshot: builder.query<any, { date?: string } | void>({
      query: (params) => ({
        url: "/dashboard/snapshot",
        params: params || {},
      }),
    }),
  }),
});

export const {
  useGetCampusesQuery,
  useGetCampusQuery,
  useCreateCampusMutation,
  useUpdateCampusMutation,
  useDeleteCampusMutation,
  useGetProgramsQuery,
  useGetProgramQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
  useAssignUserRoleMutation,
  useRemoveUserRoleMutation,
  useGetRolesQuery,
  useGetBillingPlansQuery,
  useGetPublicPlansQuery,
  useGetBillingPlanQuery,
  useCreateBillingPlanMutation,
  useUpdateBillingPlanMutation,
  useDeleteBillingPlanMutation,
  useSyncBillingPlanToStripeMutation,
  useCreateCheckoutSessionMutation,
  useCreateBillingPortalSessionMutation,
  useGetCampusSubscriptionQuery,
  useGetLeadsQuery,
  useGetLeadQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useGetCourseClassesQuery,
  useGetClassSectionsQuery,
  useGetClassSectionQuery,
  useCreateClassSectionMutation,
  useUpdateClassSectionMutation,
  useDeleteClassSectionMutation,
  useGetAcademicYearsQuery,
  useGetMakeupRequestsQuery,
  useUpdateMakeupRequestMutation,
  useGetAssessmentAttemptsQuery,
  useGetBroadcastsQuery,
  useCreateBroadcastMutation,
  useGetStudentProfilesQuery,
  useGetStudentProfileQuery,
  useCreateStudentProfileMutation,
  useUpdateStudentProfileMutation,
  useDeleteStudentProfileMutation,
  useRestoreStudentProfileMutation,
  useCreateStudentPlacementMutation,
  useDeleteStudentPlacementMutation,
  useCreateStudentEnrollmentMutation,
  useDeleteStudentEnrollmentMutation,
  useCreateGuardianProfileMutation,
  useSelfLinkGuardianMutation,
  useGetTeacherProfilesQuery,
  useGetTeacherProfileQuery,
  useCreateTeacherProfileMutation,
  useUpdateTeacherProfileMutation,
  useDeleteTeacherProfileMutation,
  useAssignTeacherClassMutation,
  useRemoveTeacherClassMutation,
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useUploadFileMutation,
  useGetDashboardSnapshotQuery,
} = dashboardApi;
