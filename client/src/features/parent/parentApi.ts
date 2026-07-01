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

export const parentApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
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
    getInvoices: builder.query<FamilyInvoice[], void>({
      query: () => "/parent/billing/invoices",
      providesTags: ["ParentPortal"],
    }),
    getPayments: builder.query<FamilyPayment[], void>({
      query: () => "/parent/billing/payments",
      providesTags: ["ParentPortal"],
    }),
  }),
});

export const {
  useGetChildrenQuery,
  useGetChildTeachersQuery,
  useGetChildAttendanceQuery,
  useGetChildHomeworkQuery,
  useGetChildGradesQuery,
  useGetInvoicesQuery,
  useGetPaymentsQuery,
} = parentApi;
