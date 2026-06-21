"use client";

import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassDailySheetQuery,
  useRecordDailyAttendanceMutation,
  useGetClassAttendanceSummaryQuery,
  useGetMonthlyAttendanceSummaryQuery,
  useGetAbsenceTrendsQuery,
  useGetAtRiskAttendanceStudentsQuery,
  useGetStudentSummaryQuery,
} from "@/features/academic/attendanceApi";
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Save,
  Search,
  Users,
  GraduationCap,
  Sparkles,
  ClipboardList,
  ChevronRight,
  TrendingDown,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts";

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
    linkedStudents[0]?.studentProfileId || ""
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
    { skip: !selectedClassId || !selectedDate || !isAdmin && !isTeacher }
  );

  // Load Stats Summaries
  const todayStr = new Date().toISOString().split("T")[0];
  const startOfMonthStr = `${selectedDate.substring(0, 7)}-01`;
  const { data: classSummary } = useGetClassAttendanceSummaryQuery(
    { classSectionId: selectedClassId, startDate: startOfMonthStr, endDate: selectedDate },
    { skip: !selectedClassId || !isAdmin && !isTeacher }
  );

  const { data: monthlySummary } = useGetMonthlyAttendanceSummaryQuery(
    {
      month: selectedDate.substring(0, 7),
      classSectionId: selectedClassId !== "all" ? selectedClassId : undefined,
      academicYearId: academicYearId || undefined,
    },
    { skip: !selectedDate || !isAdmin && !isTeacher }
  );

  const { data: absenceTrends } = useGetAbsenceTrendsQuery(
    { startDate: startOfMonthStr, endDate: selectedDate, classSectionId: selectedClassId },
    { skip: !selectedClassId || !isAdmin && !isTeacher }
  );

  const { data: atRiskStudents } = useGetAtRiskAttendanceStudentsQuery(
    { threshold: 85, academicYearId, classSectionId: selectedClassId },
    { skip: !academicYearId || !selectedClassId || !isAdmin && !isTeacher }
  );

  // Student profile query for Student/Guardian roles
  const targetStudentId = isStudent ? user?.studentProfile?.id : selectedStudentId;
  const { data: studentSummary, isLoading: isLoadingStudentSummary } = useGetStudentSummaryQuery(
    { studentProfileId: targetStudentId || "" },
    { skip: !targetStudentId }
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

  const handleStatusChange = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") => {
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
      row.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dailySheet, searchQuery]);

  const unmarkedCount = React.useMemo(() => {
    if (!dailySheet) return 0;
    return dailySheet.filter((row) => row.status === null).length;
  }, [dailySheet]);

  // --- RENDER ROLES VIEW ---

  // 1. STUDENT OR GUARDIAN VIEW
  if (isStudent || isGuardian) {
    const dailyStats = studentSummary?.dailyStats || { total: 0, attendanceRate: 100, breakdown: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } };
    const subjectStats = studentSummary?.subjectStats || { total: 0, attendanceRate: 100, breakdown: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-display flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-indigo-500" />
              Attendance Record
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              {isStudent ? "Track your daily and subject-wise classroom attendance." : "Monitor attendance records and statistics for linked students."}
            </p>
          </div>
        </div>

        {isGuardian && linkedStudents.length > 1 && (
          <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 flex gap-2">
            {linkedStudents.map((rel: any) => (
              <Button
                key={rel.studentProfileId}
                variant={selectedStudentId === rel.studentProfileId ? "default" : "outline"}
                onClick={() => setSelectedStudentId(rel.studentProfileId)}
                className="rounded-xl text-xs font-semibold px-4 cursor-pointer"
              >
                {rel.studentProfile?.fullName || "Student"}
              </Button>
            ))}
          </div>
        )}

        {isLoadingStudentSummary ? (
          <div className="h-48 flex items-center justify-center text-xs text-neutral-400">
            Loading student attendance summaries...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Attendance Overview Card */}
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Homeroom Daily Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  Summary stats for total school operational days.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10">
                    <div className="text-center">
                      <span className="text-2xl font-black text-neutral-800 dark:text-neutral-200">
                        {dailyStats.attendanceRate}%
                      </span>
                      <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Rate</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-neutral-50 dark:bg-zinc-900 p-3 rounded-xl">
                      <span className="text-neutral-400 dark:text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Total Recorded</span>
                      <p className="text-lg font-black text-neutral-800 dark:text-neutral-200">{dailyStats.total}</p>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-3 rounded-xl">
                      <span className="text-emerald-600/70 dark:text-emerald-400/70 text-[10px] uppercase font-bold tracking-wider">Present</span>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{dailyStats.breakdown.PRESENT + dailyStats.breakdown.LATE + dailyStats.breakdown.EXCUSED}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status Breakdown</span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-emerald-50/40 dark:bg-emerald-500/5 p-2 rounded-xl text-emerald-700 dark:text-emerald-400">
                      <div className="font-black text-sm">{dailyStats.breakdown.PRESENT}</div>
                      <div className="text-[9px] font-semibold">On Time</div>
                    </div>
                    <div className="bg-amber-50/40 dark:bg-amber-500/5 p-2 rounded-xl text-amber-700 dark:text-amber-400">
                      <div className="font-black text-sm">{dailyStats.breakdown.LATE}</div>
                      <div className="text-[9px] font-semibold">Late</div>
                    </div>
                    <div className="bg-blue-50/40 dark:bg-blue-500/5 p-2 rounded-xl text-blue-700 dark:text-blue-400">
                      <div className="font-black text-sm">{dailyStats.breakdown.EXCUSED}</div>
                      <div className="text-[9px] font-semibold">Excused</div>
                    </div>
                    <div className="bg-rose-50/40 dark:bg-rose-500/5 p-2 rounded-xl text-rose-700 dark:text-rose-400">
                      <div className="font-black text-sm">{dailyStats.breakdown.ABSENT}</div>
                      <div className="text-[9px] font-semibold">Absent</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Attendance Card */}
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                  <GraduationCap className="w-4 h-4 text-violet-500" />
                  Subject Class Sessions Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  Summary stats for subject-level lecture schedules.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-4 border-violet-500 bg-violet-50/50 dark:bg-violet-500/10">
                    <div className="text-center">
                      <span className="text-2xl font-black text-neutral-800 dark:text-neutral-200">
                        {subjectStats.attendanceRate}%
                      </span>
                      <p className="text-[8px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">Rate</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-neutral-50 dark:bg-zinc-900 p-3 rounded-xl">
                      <span className="text-neutral-400 dark:text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Total Lectures</span>
                      <p className="text-lg font-black text-neutral-800 dark:text-neutral-200">{subjectStats.total}</p>
                    </div>
                    <div className="bg-violet-50/50 dark:bg-violet-500/5 p-3 rounded-xl">
                      <span className="text-violet-600/70 dark:text-violet-400/70 text-[10px] uppercase font-bold tracking-wider">Attended</span>
                      <p className="text-lg font-black text-violet-600 dark:text-violet-400">{subjectStats.breakdown.PRESENT + subjectStats.breakdown.LATE + subjectStats.breakdown.EXCUSED}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status Breakdown</span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-emerald-50/40 dark:bg-emerald-500/5 p-2 rounded-xl text-emerald-700 dark:text-emerald-400">
                      <div className="font-black text-sm">{subjectStats.breakdown.PRESENT}</div>
                      <div className="text-[9px] font-semibold">Attended</div>
                    </div>
                    <div className="bg-amber-50/40 dark:bg-amber-500/5 p-2 rounded-xl text-amber-700 dark:text-amber-400">
                      <div className="font-black text-sm">{subjectStats.breakdown.LATE}</div>
                      <div className="text-[9px] font-semibold">Late</div>
                    </div>
                    <div className="bg-blue-50/40 dark:bg-blue-500/5 p-2 rounded-xl text-blue-700 dark:text-blue-400">
                      <div className="font-black text-sm">{subjectStats.breakdown.EXCUSED}</div>
                      <div className="text-[9px] font-semibold">Excused</div>
                    </div>
                    <div className="bg-rose-50/40 dark:bg-rose-500/5 p-2 rounded-xl text-rose-700 dark:text-rose-400">
                      <div className="font-black text-sm">{subjectStats.breakdown.ABSENT}</div>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-display flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-rose-500" />
            Attendance & Roster Daily Marking
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Manage student attendance rosters, record notes, view monthly sheets, trends and track at-risk students.
          </p>
        </div>
      </div>

      {/* Control panel & filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Class Section</Label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 text-neutral-800 dark:text-neutral-200 focus:outline-none"
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
          <Label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Attendance Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-11 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 text-neutral-800 dark:text-neutral-200"
          />
        </div>

        <div className="flex flex-col justify-end gap-1.5">
          <Label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:block">&nbsp;</Label>
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab("sheet")}
              variant={activeTab === "sheet" ? "default" : "outline"}
              className="flex-1 rounded-xl h-11 text-xs font-bold cursor-pointer"
            >
              Roster Marking
            </Button>
            <Button
              onClick={() => setActiveTab("reports")}
              variant={activeTab === "reports" ? "default" : "outline"}
              className="flex-1 rounded-xl h-11 text-xs font-bold cursor-pointer"
            >
              Analytics Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      {activeTab === "sheet" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Unmarked Placements</span>
              <p className="text-xl font-black text-rose-500 mt-0.5">{unmarkedCount}</p>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Daily Presence Rate</span>
              <p className="text-xl font-black text-emerald-500 mt-0.5">
                {classSummary?.attendanceRate ?? 100}%
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Monthly Rate ({selectedDate.substring(0, 7)})</span>
              <p className="text-xl font-black text-indigo-500 mt-0.5">
                {monthlySummary?.attendanceRate ?? 100}%
              </p>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">At Risk Placements</span>
              <p className="text-xl font-black text-amber-500 mt-0.5">
                {atRiskStudents?.length ?? 0}
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
              <TrendingDown className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs panels */}
      {activeTab === "sheet" ? (
        <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          {/* Header toolbar */}
          <div className="border-b border-neutral-100 dark:border-zinc-800 p-5 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search student profile name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 w-full"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button
                onClick={handleMarkAllPresent}
                variant="outline"
                className="rounded-xl h-10 text-xs font-semibold cursor-pointer w-full md:w-auto hover:bg-neutral-50 dark:hover:bg-zinc-900"
              >
                Mark All Present
              </Button>
              <Button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="rounded-xl h-10 text-xs font-semibold cursor-pointer w-full md:w-auto bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Saving..." : "Save Roster Attendance"}
              </Button>
            </div>
          </div>

          {/* Roster Marking Grid */}
          <div className="overflow-x-auto">
            {isLoadingSheet ? (
              <div className="h-48 flex items-center justify-center text-xs text-neutral-400">
                Loading class section roster...
              </div>
            ) : filteredSheet.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-xs text-neutral-400 gap-2">
                <Users className="w-8 h-8 text-neutral-300 dark:text-zinc-700" />
                No student profiles found for this class section.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/60 dark:bg-zinc-900/40 border-b border-neutral-100 dark:border-zinc-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Student Profile</th>
                    <th className="py-3 px-6">Gender</th>
                    <th className="py-3 px-6 text-center">Status Toggle</th>
                    <th className="py-3 px-6">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800 text-xs text-neutral-800 dark:text-neutral-200">
                  {filteredSheet.map((row) => {
                    const localRec = localRecords[row.studentProfileId] || {
                      status: "PRESENT",
                      remarks: "",
                    };
                    const isUnmarked = row.status === null;

                    return (
                      <tr
                        key={row.studentProfileId}
                        className="hover:bg-neutral-50/40 dark:hover:bg-zinc-900/10 transition-colors"
                      >
                        <td className="py-4 px-6 font-bold flex items-center gap-2.5">
                          {row.fullName}
                          {isUnmarked && (
                            <Badge className="bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400 rounded-md font-semibold text-[8px] py-0 px-1 border-none">
                              Unmarked
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-6 uppercase font-semibold text-[9px] tracking-wider text-neutral-400">
                          {row.gender}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center items-center gap-1.5">
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
                                  className={`rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase transition-all duration-150 cursor-pointer ${variantColors[status]}`}
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
                        <td className="py-4 px-6">
                          <Input
                            type="text"
                            placeholder="Add note, e.g. parent called, dentist appt..."
                            value={localRec.remarks}
                            onChange={(e) => handleRemarksChange(row.studentProfileId, e.target.value)}
                            className="h-8 rounded-lg border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trends and monthly summaries */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Absence & Tardiness Daily Trends
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily absence and late counts recorded during this month.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!absenceTrends || absenceTrends.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
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
                          contentStyle={{ fontSize: "11px", borderRadius: "12px", border: "1px solid #ddd" }}
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
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Monthly Status Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Breakdown distribution of all recorded statuses for this month.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!monthlySummary || monthlySummary.total === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
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
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{ fontSize: "11px", borderRadius: "12px", border: "1px solid #ddd" }}
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
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden h-full">
              <CardHeader className="border-b border-neutral-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  At-Risk Students List
                </CardTitle>
                <CardDescription className="text-xs">
                  Students with attendance rates below 85% this year.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {!atRiskStudents || atRiskStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-neutral-400 gap-2 h-64">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                    All student profiles exceed the 85% attendance standard!
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                    {atRiskStudents.map((row) => (
                      <div
                        key={row.studentProfileId}
                        className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-200/60 dark:border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            {row.fullName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-semibold uppercase">
                            <span>{row.classSectionName}</span>
                            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-zinc-700"></span>
                            <span className="text-rose-500 font-bold">{row.absentCount} Absences</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                            {row.attendanceRate}%
                          </span>
                          <p className="text-[8px] text-neutral-400 uppercase font-bold tracking-wider">Rate</p>
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
