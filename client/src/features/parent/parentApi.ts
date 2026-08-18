import { authApi } from "../auth/authApi";

export interface ChildRollup {
  studentProfileId: string;
  fullName: string;
  birthDate: string;
  gender: string;
  classSection: {
    id: string;
    name: string;
    code: string;
  } | null;
  attendanceRate: number;
  pendingHomeworkCount: number;
  latestGrade: {
    title: string;
    percentage: number;
    pointsEarned: number;
    pointsPossible: number;
    assessedAt: string;
  } | null;
}

export interface FamilyInvoice {
  id: string;
  familyId: string;
  amount: number;
  currency: string;
  description: string | null;
  issueDate: string;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  createdAt: string;
}

export interface FamilyPayment {
  id: string;
  familyId: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ChildLearning {
  lessonsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  level: number;
  mastery: {
    competencyName: string;
    masteryScore: number;
    status: "NOT_STARTED" | "INTRODUCED" | "DEVELOPING" | "NEAR_MASTERY" | "MASTERED";
  }[];
}

/** A catalog course as returned by the guardian-facing available-courses list. */
export interface AvailableCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  estimatedHours: number | null;
  gradeBand: "PRE_K_K" | "G1_2" | "G3_4" | "G5_6" | null;
  learningSubject: { id: string; name: string; code: string };
  _count: { concepts: number };
  isAssigned: boolean;
}

export interface CourseAssignment {
  id: string;
  studentProfileId: string;
  courseId: string;
  assignedByUserId: string;
  createdAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    gradeBand: "PRE_K_K" | "G1_2" | "G3_4" | "G5_6" | null;
    learningSubject: { id: string; name: string; code: string };
    _count: { concepts: number };
  };
}

/** A term-bound Batch staff has opted into guardian self-enrollment. */
export interface AvailableClass {
  id: string;
  name: string;
  code: string;
  description: string | null;
  capacity: number | null;
  campusId: string | null;
  term: { id: string; name: string; endDate: string };
  _count: { enrollments: number };
  isEnrolled: boolean;
}

export interface ClassEnrollment {
  id: string;
  studentProfileId: string;
  batchId: string;
  enrollmentDate: string;
  status: "ENROLLED" | "COMPLETED" | "DROPPED";
  batch: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    term: { id: string; name: string; endDate: string };
  };
}

export const parentApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Creates a child under the signed-in guardian. Unlike the older
     * link-by-email flow this needs no account for the child — they have no
     * login of their own and reach content through the guardian's session.
     */
    createChild: builder.mutation<
      { id: string; fullName: string },
      { fullName: string; birthDate: string; classId?: string }
    >({
      query: (body) => ({ url: "/parent/children", method: "POST", body }),
      invalidatesTags: ["ParentPortal"],
    }),
    getChildren: builder.query<ChildRollup[], void>({
      query: () => "/parent/children",
      providesTags: ["ParentPortal"],
    }),
    getChildTeachers: builder.query<any[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/teachers`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `TEACHERS-${id}` }],
    }),
    getChildAttendance: builder.query<any[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/attendance`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `ATTENDANCE-${id}` }],
    }),
    getChildHomework: builder.query<any[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/homework`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `HOMEWORK-${id}` }],
    }),
    getChildGrades: builder.query<any[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/grades`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `GRADES-${id}` }],
    }),
    getChildLearning: builder.query<ChildLearning, string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/learning`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `LEARNING-${id}` }],
    }),
    getInvoices: builder.query<FamilyInvoice[], void>({
      query: () => "/parent/billing/invoices",
      providesTags: ["ParentPortal"],
    }),
    getPayments: builder.query<FamilyPayment[], void>({
      query: () => "/parent/billing/payments",
      providesTags: ["ParentPortal"],
    }),

    getAvailableCourses: builder.query<AvailableCourse[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/available-courses`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `AVAILABLE-COURSES-${id}` }],
    }),
    getCourseAssignments: builder.query<CourseAssignment[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/course-assignments`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `COURSE-PLAN-${id}` }],
    }),
    assignCourse: builder.mutation<CourseAssignment, { studentProfileId: string; courseId: string }>({
      query: ({ studentProfileId, courseId }) => ({
        url: `/parent/children/${studentProfileId}/course-assignments`,
        method: "POST",
        body: { courseId },
      }),
      // Both lists move together — the browse list's isAssigned flag is derived
      // from the plan, so invalidating only one leaves the UI inconsistent.
      invalidatesTags: (result, error, { studentProfileId }) => [
        { type: "ParentPortal", id: `COURSE-PLAN-${studentProfileId}` },
        { type: "ParentPortal", id: `AVAILABLE-COURSES-${studentProfileId}` },
      ],
    }),
    removeCourseAssignment: builder.mutation<{ message: string }, { studentProfileId: string; courseId: string }>({
      query: ({ studentProfileId, courseId }) => ({
        url: `/parent/children/${studentProfileId}/course-assignments/${courseId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { studentProfileId }) => [
        { type: "ParentPortal", id: `COURSE-PLAN-${studentProfileId}` },
        { type: "ParentPortal", id: `AVAILABLE-COURSES-${studentProfileId}` },
      ],
    }),

    getAvailableClasses: builder.query<AvailableClass[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/available-classes`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `AVAILABLE-CLASSES-${id}` }],
    }),
    getClassEnrollments: builder.query<ClassEnrollment[], string>({
      query: (studentProfileId) => `/parent/children/${studentProfileId}/class-enrollments`,
      providesTags: (result, error, id) => [{ type: "ParentPortal", id: `CLASS-ENROLLMENTS-${id}` }],
    }),
    enrollInClass: builder.mutation<ClassEnrollment, { studentProfileId: string; batchId: string }>({
      query: ({ studentProfileId, batchId }) => ({
        url: `/parent/children/${studentProfileId}/class-enrollments`,
        method: "POST",
        body: { batchId },
      }),
      invalidatesTags: (result, error, { studentProfileId }) => [
        { type: "ParentPortal", id: `CLASS-ENROLLMENTS-${studentProfileId}` },
        { type: "ParentPortal", id: `AVAILABLE-CLASSES-${studentProfileId}` },
      ],
    }),
    removeClassEnrollment: builder.mutation<{ message: string }, { studentProfileId: string; enrollmentId: string }>({
      query: ({ studentProfileId, enrollmentId }) => ({
        url: `/parent/children/${studentProfileId}/class-enrollments/${enrollmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { studentProfileId }) => [
        { type: "ParentPortal", id: `CLASS-ENROLLMENTS-${studentProfileId}` },
        { type: "ParentPortal", id: `AVAILABLE-CLASSES-${studentProfileId}` },
      ],
    }),
  }),
});

export const {
  useCreateChildMutation,
  useGetChildrenQuery,
  useGetChildTeachersQuery,
  useGetChildAttendanceQuery,
  useGetChildHomeworkQuery,
  useGetChildGradesQuery,
  useGetChildLearningQuery,
  useGetInvoicesQuery,
  useGetPaymentsQuery,
  useGetAvailableCoursesQuery,
  useGetCourseAssignmentsQuery,
  useAssignCourseMutation,
  useRemoveCourseAssignmentMutation,
  useGetAvailableClassesQuery,
  useGetClassEnrollmentsQuery,
  useEnrollInClassMutation,
  useRemoveClassEnrollmentMutation,
} = parentApi;
