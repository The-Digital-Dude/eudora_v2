"use client";

import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  GraduationCap,
  Info,
  Save,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent,CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetAbsenceTrendsQuery,
  useGetAtRiskAttendanceStudentsQuery,
  useGetClassAttendanceSummaryQuery,
  useGetClassDailySheetQuery,
  useGetMonthlyAttendanceSummaryQuery,
  useGetStudentSummaryQuery,
  useRecordDailyAttendanceMutation,
} from "@/features/academic/attendanceApi";
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";
import { useAppSelector } from "@/store/hooks";

export default function AttendancePage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  // Resolve user role list
  const userRoles = React.useMemo<string[]>(() => {
    if (!user) return [];
    const rolesList: string[] = [];
    if (user.role) rolesList.push(user.role);
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (typeof r === "string") rolesList.push(r);
        else if (r?.name) rolesList.push(r.name);
        else if (r?.role?.name) rolesList.push(r.role?.name);
      });
    }
    return rolesList;
  }, [user]);

  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  const isTeacher = userRoles.includes("TEACHER");
  const isStudent = userRoles.includes("USER") && user?.studentProfile;
  const isGuardian = userRoles.includes("GUARDIAN") && user?.guardianProfile;

  // 1. TEACHER / ADMIN WORKSPACE STATES
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [activeTab, setActiveTab] = React.useState<"sheet" | "reports">("sheet");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Roster entries local state for bulk editing
  const [localRecords, setLocalRecords] = React.useState<
    Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string }>
  >({});

  // 2. GUARDIAN STATES
  const linkedStudents = user?.guardianProfile?.students || [];
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(
    linkedStudents[0]?.studentProfileId || "",
  );

  // Queries
  const { data: classSectionsData, isLoading: isLoadingClasses } = useGetClassSectionsQuery();
  const classSections = classSectionsData?.items || [];

  // Set default class section if empty
  React.useEffect(() => {
    if (classSections.length > 0 && !selectedClassId) {
      setSelectedClassId(classSections[0].id);
    }
  }, [classSections, selectedClassId]);

  const selectedClass = React.useMemo(() => {
    return classSections.find((c) => c.id === selectedClassId) || null;
  }, [classSections, selectedClassId]);

  const academicYearId = selectedClass?.academicYearId || "";

  // Load Daily Attendance Sheet
  const {
    data: dailySheet,
    isLoading: isLoadingSheet,
    refetch: refetchSheet,
  } = useGetClassDailySheetQuery(
    { classSectionId: selectedClassId, date: selectedDate },
    { skip: !selectedClassId || !selectedDate || (!isAdmin && !isTeacher) },
  );

  // Load Stats Summaries
  const todayStr = new Date().toISOString().split("T")[0];
  const startOfMonthStr = `${selectedDate.substring(0, 7)}-01`;
  const { data: classSummary } = useGetClassAttendanceSummaryQuery(
    { classSectionId: selectedClassId, startDate: startOfMonthStr, endDate: selectedDate },
    { skip: !selectedClassId || (!isAdmin && !isTeacher) },
  );

  const { data: monthlySummary } = useGetMonthlyAttendanceSummaryQuery(
    {
      month: selectedDate.substring(0, 7),
      classSectionId: selectedClassId !== "all" ? selectedClassId : undefined,
      academicYearId: academicYearId || undefined,
    },
    { skip: !selectedDate || (!isAdmin && !isTeacher) },
  );

  const { data: absenceTrends } = useGetAbsenceTrendsQuery(
    { startDate: startOfMonthStr, endDate: selectedDate, classSectionId: selectedClassId },
    { skip: !selectedClassId || (!isAdmin && !isTeacher) },
  );

  const { data: atRiskStudents } = useGetAtRiskAttendanceStudentsQuery(
    { threshold: 85, academicYearId, classSectionId: selectedClassId },
    { skip: !academicYearId || !selectedClassId || (!isAdmin && !isTeacher) },
  );

  // Student profile query for Student/Guardian roles
  const targetStudentId = isStudent ? user?.studentProfile?.id : selectedStudentId;
  const { data: studentSummary, isLoading: isLoadingStudentSummary } = useGetStudentSummaryQuery(
    { studentProfileId: targetStudentId || "" },
    { skip: !targetStudentId },
  );

  // Mutation
  const [recordAttendance, { isLoading: isSaving }] = useRecordDailyAttendanceMutation();

  // Populate local records state when server sheet data loads
  React.useEffect(() => {
    if (dailySheet) {
      const recordsMap: typeof localRecords = {};
      dailySheet.forEach((row) => {
        recordsMap[row.studentProfileId] = {
          status: row.status || "PRESENT", // default to Present if unmarked
          remarks: row.remarks || "",
        };
      });
      setLocalRecords(recordsMap);
    }
  }, [dailySheet]);

  const handleStatusChange = (
    studentId: string,
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
  ) => {
    setLocalRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setLocalRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    if (!dailySheet) return;
    const recordsMap: typeof localRecords = {};
    dailySheet.forEach((row) => {
      recordsMap[row.studentProfileId] = {
        status: "PRESENT",
        remarks: localRecords[row.studentProfileId]?.remarks || "",
      };
    });
    setLocalRecords(recordsMap);
    toast.success("All students marked Present locally. Don't forget to Save!");
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !selectedDate) return;
    const recordsPayload = Object.entries(localRecords).map(([studentId, data]) => ({
      studentProfileId: studentId,
      status: data.status,
      remarks: data.remarks || undefined,
    }));

    try {
      await recordAttendance({
        classSectionId: selectedClassId,
        date: selectedDate,
        records: recordsPayload,
      }).unwrap();
      toast.success("Daily attendance saved successfully!");
      refetchSheet();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to save daily attendance.");
    }
  };

  const filteredSheet = React.useMemo(() => {
    if (!dailySheet) return [];
    if (!searchQuery) return dailySheet;
    return dailySheet.filter((row) =>
      row.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [dailySheet, searchQuery]);

  const unmarkedCount = React.useMemo(() => {
    if (!dailySheet) return 0;
    return dailySheet.filter((row) => row.status === null).length;
  }, [dailySheet]);

  // --- RENDER ROLES VIEW ---

  // 1. STUDENT OR GUARDIAN VIEW
  if (isStudent || isGuardian) {
    const dailyStats = studentSummary?.dailyStats || {
      total: 0,
      attendanceRate: 100,
      breakdown: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
    };
    const subjectStats = studentSummary?.subjectStats || {
      total: 0,
      attendanceRate: 100,
      breakdown: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
              <ClipboardList className="h-6 w-6 text-indigo-500" />
              Attendance Record
            </h1>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {isStudent
                ? "Track your daily and subject-wise classroom attendance."
                : "Monitor attendance records and statistics for linked students."}
            </p>
          </div>
        </div>

        {isGuardian && linkedStudents.length > 1 && (
          <div className="flex gap-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            {linkedStudents.map((rel: any) => (
              <Button
                key={rel.studentProfileId}
                variant={selectedStudentId === rel.studentProfileId ? "default" : "outline"}
                onClick={() => setSelectedStudentId(rel.studentProfileId)}
                className="cursor-pointer rounded-xl px-4 text-xs font-semibold"
              >
                {rel.studentProfile?.fullName || "Student"}
              </Button>
            ))}
          </div>
        )}

        {isLoadingStudentSummary ? (
          <div className="flex h-48 items-center justify-center text-xs text-neutral-400">
            Loading student attendance summaries...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Daily Attendance Overview Card */}
            <Card className="overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  Homeroom Daily Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  Summary stats for total school operational days.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center gap-6">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10">
                    <div className="text-center">
                      <span className="text-2xl font-black text-neutral-800 dark:text-neutral-200">
                        {dailyStats.attendanceRate}%
                      </span>
                      <p className="text-[8px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                        Rate
                      </p>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-4">
                    <div className="rounded-xl bg-neutral-50 p-3 dark:bg-zinc-900">
                      <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                        Total Recorded
                      </span>
                      <p className="text-lg font-black text-neutral-800 dark:text-neutral-200">
                        {dailyStats.total}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/50 p-3 dark:bg-emerald-500/5">
                      <span className="text-[10px] font-bold tracking-wider text-emerald-600/70 uppercase dark:text-emerald-400/70">
                        Present
                      </span>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {dailyStats.breakdown.PRESENT +
                          dailyStats.breakdown.LATE +
                          dailyStats.breakdown.EXCUSED}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-neutral-100 pt-2 dark:border-zinc-800">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Status Breakdown
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-emerald-50/40 p-2 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400">
                      <div className="text-sm font-black">{dailyStats.breakdown.PRESENT}</div>
                      <div className="text-[9px] font-semibold">On Time</div>
                    </div>
                    <div className="rounded-xl bg-amber-50/40 p-2 text-amber-700 dark:bg-amber-500/5 dark:text-amber-400">
                      <div className="text-sm font-black">{dailyStats.breakdown.LATE}</div>
                      <div className="text-[9px] font-semibold">Late</div>
                    </div>
                    <div className="rounded-xl bg-blue-50/40 p-2 text-blue-700 dark:bg-blue-500/5 dark:text-blue-400">
                      <div className="text-sm font-black">{dailyStats.breakdown.EXCUSED}</div>
                      <div className="text-[9px] font-semibold">Excused</div>
                    </div>
                    <div className="rounded-xl bg-rose-50/40 p-2 text-rose-700 dark:bg-rose-500/5 dark:text-rose-400">
                      <div className="text-sm font-black">{dailyStats.breakdown.ABSENT}</div>
                      <div className="text-[9px] font-semibold">Absent</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Attendance Card */}
            <Card className="overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  <GraduationCap className="h-4 w-4 text-violet-500" />
                  Subject Class Sessions Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  Summary stats for subject-level lecture schedules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center gap-6">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-violet-500 bg-violet-50/50 dark:bg-violet-500/10">
                    <div className="text-center">
                      <span className="text-2xl font-black text-neutral-800 dark:text-neutral-200">
                        {subjectStats.attendanceRate}%
                      </span>
                      <p className="text-[8px] font-bold tracking-wider text-violet-600 uppercase dark:text-violet-400">
                        Rate
                      </p>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-4">
                    <div className="rounded-xl bg-neutral-50 p-3 dark:bg-zinc-900">
                      <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                        Total Lectures
                      </span>
                      <p className="text-lg font-black text-neutral-800 dark:text-neutral-200">
                        {subjectStats.total}
                      </p>
                    </div>
                    <div className="rounded-xl bg-violet-50/50 p-3 dark:bg-violet-500/5">
                      <span className="text-[10px] font-bold tracking-wider text-violet-600/70 uppercase dark:text-violet-400/70">
                        Attended
                      </span>
                      <p className="text-lg font-black text-violet-600 dark:text-violet-400">
                        {subjectStats.breakdown.PRESENT +
                          subjectStats.breakdown.LATE +
                          subjectStats.breakdown.EXCUSED}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-neutral-100 pt-2 dark:border-zinc-800">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Status Breakdown
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-emerald-50/40 p-2 text-emerald-700 dark:bg-emerald-500/5 dark:text-emerald-400">
                      <div className="text-sm font-black">{subjectStats.breakdown.PRESENT}</div>
                      <div className="text-[9px] font-semibold">Attended</div>
                    </div>
                    <div className="rounded-xl bg-amber-50/40 p-2 text-amber-700 dark:bg-amber-500/5 dark:text-amber-400">
                      <div className="text-sm font-black">{subjectStats.breakdown.LATE}</div>
                      <div className="text-[9px] font-semibold">Late</div>
                    </div>
                    <div className="rounded-xl bg-blue-50/40 p-2 text-blue-700 dark:bg-blue-500/5 dark:text-blue-400">
                      <div className="text-sm font-black">{subjectStats.breakdown.EXCUSED}</div>
                      <div className="text-[9px] font-semibold">Excused</div>
                    </div>
                    <div className="rounded-xl bg-rose-50/40 p-2 text-rose-700 dark:bg-rose-500/5 dark:text-rose-400">
                      <div className="text-sm font-black">{subjectStats.breakdown.ABSENT}</div>
                      <div className="text-[9px] font-semibold">Absent</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // 2. TEACHER OR ADMIN WORKSPACE
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
            <ClipboardList className="h-6 w-6 text-rose-500" />
            Attendance & Roster Daily Marking
          </h1>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Manage student attendance rosters, record notes, view monthly sheets, trends and track
            at-risk students.
          </p>
        </div>
      </div>

      {/* Control panel & filters */}
      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
            Class Section
          </Label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
          >
            {isLoadingClasses ? (
              <option>Loading class sections...</option>
            ) : (
              classSections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
            Attendance Date
          </Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-11 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs text-neutral-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
          />
        </div>

        <div className="flex flex-col justify-end gap-1.5">
          <Label className="hidden text-xs font-bold tracking-wider text-neutral-400 uppercase md:block dark:text-neutral-500">
            &nbsp;
          </Label>
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab("sheet")}
              variant={activeTab === "sheet" ? "default" : "outline"}
              className="h-11 flex-1 cursor-pointer rounded-xl text-xs font-bold"
            >
              Roster Marking
            </Button>
            <Button
              onClick={() => setActiveTab("reports")}
              variant={activeTab === "reports" ? "default" : "outline"}
              className="h-11 flex-1 cursor-pointer rounded-xl text-xs font-bold"
            >
              Analytics Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      {activeTab === "sheet" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                Unmarked Placements
              </span>
              <p className="mt-0.5 text-xl font-black text-rose-500">{unmarkedCount}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-2.5 dark:bg-rose-500/10">
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                Daily Presence Rate
              </span>
              <p className="mt-0.5 text-xl font-black text-emerald-500">
                {classSummary?.attendanceRate ?? 100}%
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                Monthly Rate ({selectedDate.substring(0, 7)})
              </span>
              <p className="mt-0.5 text-xl font-black text-indigo-500">
                {monthlySummary?.attendanceRate ?? 100}%
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-2.5 dark:bg-indigo-500/10">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                At Risk Placements
              </span>
              <p className="mt-0.5 text-xl font-black text-amber-500">
                {atRiskStudents?.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5 dark:bg-amber-500/10">
              <TrendingDown className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs panels */}
      {activeTab === "sheet" ? (
        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {/* Header toolbar */}
          <div className="flex flex-col items-center justify-between gap-3 border-b border-neutral-100 p-5 md:flex-row dark:border-zinc-800">
            <div className="relative w-full md:w-72">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search student profile name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border-neutral-200 bg-neutral-50/50 pl-9 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
              />
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <Button
                onClick={handleMarkAllPresent}
                variant="outline"
                className="h-10 w-full cursor-pointer rounded-xl text-xs font-semibold hover:bg-neutral-50 md:w-auto dark:hover:bg-zinc-900"
              >
                Mark All Present
              </Button>
              <Button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 md:w-auto dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save Roster Attendance"}
              </Button>
            </div>
          </div>

          {/* Roster Marking Grid */}
          <div className="overflow-x-auto">
            {isLoadingSheet ? (
              <div className="flex h-48 items-center justify-center text-xs text-neutral-400">
                Loading class section roster...
              </div>
            ) : filteredSheet.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-xs text-neutral-400">
                <Users className="h-8 w-8 text-neutral-300 dark:text-zinc-700" />
                No student profiles found for this class section.
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/60 text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-neutral-500">
                    <th className="px-6 py-3">Student Profile</th>
                    <th className="px-6 py-3">Gender</th>
                    <th className="px-6 py-3 text-center">Status Toggle</th>
                    <th className="px-6 py-3">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800 dark:divide-zinc-800 dark:text-neutral-200">
                  {filteredSheet.map((row) => {
                    const localRec = localRecords[row.studentProfileId] || {
                      status: "PRESENT",
                      remarks: "",
                    };
                    const isUnmarked = row.status === null;

                    return (
                      <tr
                        key={row.studentProfileId}
                        className="transition-colors hover:bg-neutral-50/40 dark:hover:bg-zinc-900/10"
                      >
                        <td className="flex items-center gap-2.5 px-6 py-4 font-bold">
                          {row.fullName}
                          {isUnmarked && (
                            <Badge className="rounded-md border-none bg-neutral-100 px-1 py-0 text-[8px] font-semibold text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Unmarked
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[9px] font-semibold tracking-wider text-neutral-400 uppercase">
                          {row.gender}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((status) => {
                              const isSelected = localRec.status === status;
                              const variantColors = {
                                PRESENT: isSelected
                                  ? "bg-emerald-500 text-white dark:bg-emerald-600"
                                  : "bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 hover:text-emerald-700",
                                LATE: isSelected
                                  ? "bg-amber-500 text-white dark:bg-amber-600"
                                  : "bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-500/5 text-amber-600 hover:text-amber-700",
                                EXCUSED: isSelected
                                  ? "bg-sky-500 text-white dark:bg-sky-600"
                                  : "bg-sky-50/50 hover:bg-sky-50 dark:bg-sky-500/5 text-sky-600 hover:text-sky-700",
                                ABSENT: isSelected
                                  ? "bg-rose-500 text-white dark:bg-rose-600"
                                  : "bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-500/5 text-rose-600 hover:text-rose-700",
                              };

                              return (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(row.studentProfileId, status)}
                                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase transition-all duration-150 ${variantColors[status]}`}
                                >
                                  {status === "PRESENT" && "Present"}
                                  {status === "LATE" && "Late"}
                                  {status === "EXCUSED" && "Excused"}
                                  {status === "ABSENT" && "Absent"}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            type="text"
                            placeholder="Add note, e.g. parent called, dentist appt..."
                            value={localRec.remarks}
                            onChange={(e) =>
                              handleRemarksChange(row.studentProfileId, e.target.value)
                            }
                            className="h-8 rounded-lg border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* REPORTS AND ANALYTICS TAB */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Trends and monthly summaries */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Absence & Tardiness Daily Trends
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily absence and late counts recorded during this month.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!absenceTrends || absenceTrends.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-xs text-neutral-400">
                    No trend records available for this date range.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={absenceTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 9 }}
                        />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{
                            fontSize: "11px",
                            borderRadius: "12px",
                            border: "1px solid #ddd",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Line
                          type="monotone"
                          dataKey="absentCount"
                          name="Absences"
                          stroke="#ef4444"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="lateCount"
                          name="Lates"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Status Summary */}
            <Card className="overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Monthly Status Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Breakdown distribution of all recorded statuses for this month.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!monthlySummary || monthlySummary.total === 0 ? (
                  <div className="flex h-64 items-center justify-center text-xs text-neutral-400">
                    No summary data recorded for this month.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Present",
                            count: monthlySummary.breakdown.PRESENT,
                            fill: "#10b981",
                          },
                          {
                            name: "Late",
                            count: monthlySummary.breakdown.LATE,
                            fill: "#f59e0b",
                          },
                          {
                            name: "Excused",
                            count: monthlySummary.breakdown.EXCUSED,
                            fill: "#0ea5e9",
                          },
                          {
                            name: "Absent",
                            count: monthlySummary.breakdown.ABSENT,
                            fill: "#ef4444",
                          },
                        ]}
                        barSize={32}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 9 }}
                        />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{
                            fontSize: "11px",
                            borderRadius: "12px",
                            border: "1px solid #ddd",
                          }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Students Panel */}
          <div className="space-y-6">
            <Card className="h-full overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  At-Risk Students List
                </CardTitle>
                <CardDescription className="text-xs">
                  Students with attendance rates below 85% this year.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {!atRiskStudents || atRiskStudents.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 p-8 text-center text-xs text-neutral-400">
                    <Sparkles className="h-8 w-8 text-emerald-400" />
                    All student profiles exceed the 85% attendance standard!
                  </div>
                ) : (
                  <div className="max-h-[500px] space-y-3.5 overflow-y-auto pr-1">
                    {atRiskStudents.map((row) => (
                      <div
                        key={row.studentProfileId}
                        className="flex items-center justify-between rounded-2xl border border-neutral-200/60 bg-neutral-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            {row.fullName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-neutral-400 uppercase">
                            <span>{row.classSectionName}</span>
                            <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-zinc-700"></span>
                            <span className="font-bold text-rose-500">
                              {row.absentCount} Absences
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                            {row.attendanceRate}%
                          </span>
                          <p className="text-[8px] font-bold tracking-wider text-neutral-400 uppercase">
                            Rate
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
