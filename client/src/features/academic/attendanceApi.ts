import { authApi } from "../auth/authApi";

export interface DailyAttendanceRecord {
  studentProfileId: string;
  fullName: string;
  gender: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null;
  remarks: string | null;
  attendanceId: string | null;
}

export interface RecordDailyAttendancePayload {
  classSectionId: string;
  date: string;
  records: {
    studentProfileId: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
  }[];
}

export interface AttendanceSummary {
  total: number;
  attendanceRate: number;
  breakdown: {
    PRESENT: number;
    ABSENT: number;
    LATE: number;
    EXCUSED: number;
  };
}

export interface MonthlySummary {
  month: string;
  total: number;
  attendanceRate: number;
  breakdown: {
    PRESENT: number;
    ABSENT: number;
    LATE: number;
    EXCUSED: number;
  };
}

export interface AbsenceTrend {
  date: string;
  absentCount: number;
  lateCount: number;
}

export interface AtRiskStudent {
  studentProfileId: string;
  fullName: string;
  classSectionName: string;
  classSectionId: string;
  attendanceRate: number;
  absentCount: number;
  lateCount: number;
  totalClasses: number;
}

export const attendanceApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getClassDailySheet: builder.query<
      DailyAttendanceRecord[],
      { classSectionId: string; date: string }
    >({
      query: ({ classSectionId, date }) =>
        `/attendance/daily/class-section/${classSectionId}/sheet?date=${date}`,
      providesTags: (result, error, { classSectionId, date }) => [
        { type: "Attendance", id: `SHEET-${classSectionId}-${date}` },
      ],
    }),

    recordDailyAttendance: builder.mutation<any, RecordDailyAttendancePayload>({
      query: (body) => ({
        url: "/attendance/daily",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Attendance" }],
    }),

    getClassAttendanceSummary: builder.query<
      AttendanceSummary,
      { classSectionId: string; startDate: string; endDate: string }
    >({
      query: ({ classSectionId, startDate, endDate }) =>
        `/attendance/reports/class-section/${classSectionId}?startDate=${startDate}&endDate=${endDate}`,
      providesTags: (result, error, { classSectionId }) => [
        { type: "Attendance", id: `SUMMARY-${classSectionId}` },
      ],
    }),

    getMonthlyAttendanceSummary: builder.query<
      MonthlySummary,
      { month: string; academicYearId?: string; classSectionId?: string }
    >({
      query: ({ month, academicYearId, classSectionId }) => {
        const queryParts = [`month=${month}`];
        if (academicYearId) queryParts.push(`academicYearId=${academicYearId}`);
        if (classSectionId) queryParts.push(`classSectionId=${classSectionId}`);
        return `/attendance/reports/monthly?${queryParts.join("&")}`;
      },
      providesTags: (result, error, { month, classSectionId }) => [
        { type: "Attendance", id: `MONTHLY-${classSectionId || "ALL"}-${month}` },
      ],
    }),

    getAbsenceTrends: builder.query<
      AbsenceTrend[],
      { startDate: string; endDate: string; classSectionId?: string }
    >({
      query: ({ startDate, endDate, classSectionId }) => {
        const queryParts = [`startDate=${startDate}`, `endDate=${endDate}`];
        if (classSectionId) queryParts.push(`classSectionId=${classSectionId}`);
        return `/attendance/reports/absence-trends?${queryParts.join("&")}`;
      },
      providesTags: (result, error, { classSectionId }) => [
        { type: "Attendance", id: `TRENDS-${classSectionId || "ALL"}` },
      ],
    }),

    getAtRiskAttendanceStudents: builder.query<
      AtRiskStudent[],
      { threshold?: number; academicYearId: string; classSectionId?: string }
    >({
      query: ({ threshold = 85, academicYearId, classSectionId }) => {
        const queryParts = [`threshold=${threshold}`, `academicYearId=${academicYearId}`];
        if (classSectionId) queryParts.push(`classSectionId=${classSectionId}`);
        return `/attendance/reports/at-risk?${queryParts.join("&")}`;
      },
      providesTags: (result, error, { academicYearId, classSectionId }) => [
        { type: "Attendance", id: `AT_RISK-${classSectionId || "ALL"}-${academicYearId}` },
      ],
    }),

    getStudentSummary: builder.query<
      any,
      { studentProfileId: string; startDate?: string; endDate?: string }
    >({
      query: ({ studentProfileId, startDate, endDate }) => {
        const queryParts = [];
        if (startDate) queryParts.push(`startDate=${startDate}`);
        if (endDate) queryParts.push(`endDate=${endDate}`);
        const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
        return `/attendance/student/${studentProfileId}/summary${queryString}`;
      },
      providesTags: (result, error, { studentProfileId }) => [
        { type: "Attendance", id: `STUDENT_SUMMARY-${studentProfileId}` },
      ],
    }),
  }),
});

export const {
  useGetClassDailySheetQuery,
  useRecordDailyAttendanceMutation,
  useGetClassAttendanceSummaryQuery,
  useGetMonthlyAttendanceSummaryQuery,
  useGetAbsenceTrendsQuery,
  useGetAtRiskAttendanceStudentsQuery,
  useGetStudentSummaryQuery,
} = attendanceApi;
