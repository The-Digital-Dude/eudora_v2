"use client";

import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Save,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
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
  const classSections = React.useMemo(() => classSectionsData?.items ?? [], [classSectionsData]);

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
    const emptyStats = {
      total: 0,
      attendanceRate: 0,
      breakdown: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
    };
    const dailyStats = studentSummary?.dailyStats || emptyStats;
    const subjectStats = studentSummary?.subjectStats || emptyStats;

    // A student sits on one spine or the other: a ClassSection roster produces
    // DailyAttendance, a batch produces BatchAttendance. Showing an empty card
    // for the spine they are not on reads as a bad record, not a blank one.
    const hasDaily = dailyStats.total > 0;
    const hasSession = subjectStats.total > 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
              <ClipboardList className="h-6 w-6 text-primary" />
              Attendance Record
            </h1>
            <p className="text-xs font-medium text-muted-foreground">
              {isStudent
                ? "Your attendance record across every class and session."
                : "Monitor attendance records and statistics for linked students."}
            </p>
          </div>
        </div>

        {isGuardian && linkedStudents.length > 1 && (
          <div className="flex gap-2 rounded-2xl border border-border bg-card p-4">
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
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
            Loading student attendance summaries...
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 gap-6 ${
              hasDaily && hasSession ? "md:grid-cols-2" : ""
            }`}
          >
            {/* Daily Attendance Overview Card — only for students who are
                actually on a ClassSection roster. A course bought through
                checkout produces no DailyAttendance at all, and rendering the
                card anyway showed a prominent 0% next to a real figure. */}
            {hasDaily && (
            <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Calendar className="h-4 w-4 text-success" />
                  Homeroom Daily Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  Attendance taken once per day against your class roster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center gap-6">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-success bg-success/10">
                    <div className="text-center">
                      <span className="text-2xl font-black text-foreground">
                        {dailyStats.attendanceRate}%
                      </span>
                      <p className="text-[8px] font-bold tracking-wider text-success uppercase">
                        Rate
                      </p>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-4">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        Total Recorded
                      </span>
                      <p className="text-lg font-black text-foreground">
                        {dailyStats.total}
                      </p>
                    </div>
                    <div className="rounded-xl bg-success/10 p-3">
                      <span className="text-[10px] font-bold tracking-wider text-success/70 uppercase">
                        Present
                      </span>
                      <p className="text-lg font-black text-success">
                        {dailyStats.breakdown.PRESENT +
                          dailyStats.breakdown.LATE +
                          dailyStats.breakdown.EXCUSED}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-2">
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Status Breakdown
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-success/10 p-2 text-success">
                      <div className="text-sm font-black">{dailyStats.breakdown.PRESENT}</div>
                      <div className="text-[9px] font-semibold">On Time</div>
                    </div>
                    <div className="rounded-xl bg-warning/10 p-2 text-warning">
                      <div className="text-sm font-black">{dailyStats.breakdown.LATE}</div>
                      <div className="text-[9px] font-semibold">Late</div>
                    </div>
                    <div className="rounded-xl bg-accent p-2 text-accent-foreground">
                      <div className="text-sm font-black">{dailyStats.breakdown.EXCUSED}</div>
                      <div className="text-[9px] font-semibold">Excused</div>
                    </div>
                    <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                      <div className="text-sm font-black">{dailyStats.breakdown.ABSENT}</div>
                      <div className="text-[9px] font-semibold">Absent</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Session attendance — the batch spine. */}
            {hasSession && (
            <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Class Session Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  Attendance taken per session for the batches you are enrolled in.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center gap-6">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary bg-primary/10">
                    <div className="text-center">
                      <span className="text-2xl font-black text-foreground">
                        {subjectStats.attendanceRate}%
                      </span>
                      <p className="text-[8px] font-bold tracking-wider text-primary uppercase">
                        Rate
                      </p>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-4">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        Total Sessions
                      </span>
                      <p className="text-lg font-black text-foreground">
                        {subjectStats.total}
                      </p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-3">
                      <span className="text-[10px] font-bold tracking-wider text-primary/80 uppercase">
                        Attended
                      </span>
                      <p className="text-lg font-black text-primary">
                        {subjectStats.breakdown.PRESENT +
                          subjectStats.breakdown.LATE +
                          subjectStats.breakdown.EXCUSED}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-2">
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Status Breakdown
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-success/10 p-2 text-success">
                      <div className="text-sm font-black">{subjectStats.breakdown.PRESENT}</div>
                      <div className="text-[9px] font-semibold">Attended</div>
                    </div>
                    <div className="rounded-xl bg-warning/10 p-2 text-warning">
                      <div className="text-sm font-black">{subjectStats.breakdown.LATE}</div>
                      <div className="text-[9px] font-semibold">Late</div>
                    </div>
                    <div className="rounded-xl bg-accent p-2 text-accent-foreground">
                      <div className="text-sm font-black">{subjectStats.breakdown.EXCUSED}</div>
                      <div className="text-[9px] font-semibold">Excused</div>
                    </div>
                    <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                      <div className="text-sm font-black">{subjectStats.breakdown.ABSENT}</div>
                      <div className="text-[9px] font-semibold">Absent</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
            {!hasDaily && !hasSession && (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No attendance has been recorded yet.
                </p>
              </div>
            )}
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
          <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
            <ClipboardList className="h-6 w-6 text-primary" />
            Attendance & Roster Daily Marking
          </h1>
          <p className="text-xs font-medium text-muted-foreground">
            Manage student attendance rosters, record notes, view monthly sheets, trends and track
            at-risk students.
          </p>
        </div>
      </div>

      {/* Control panel & filters */}
      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Class Section
          </Label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-muted/30 px-3 text-xs text-foreground focus:outline-none"
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
          <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Attendance Date
          </Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-11 rounded-xl border-border bg-muted/30 text-xs text-foreground"
          />
        </div>

        <div className="flex flex-col justify-end gap-1.5">
          <Label className="hidden text-xs font-bold tracking-wider text-muted-foreground uppercase md:block">
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
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Unmarked Placements
              </span>
              <p className="mt-0.5 text-xl font-black text-destructive">{unmarkedCount}</p>
            </div>
            <div className="rounded-xl bg-destructive/10 p-2.5">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Daily Presence Rate
              </span>
              <p className="mt-0.5 text-xl font-black text-success">
                {classSummary?.attendanceRate == null
                  ? "—"
                  : `${classSummary.attendanceRate}%`}
              </p>
            </div>
            <div className="rounded-xl bg-success/10 p-2.5">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Monthly Rate ({selectedDate.substring(0, 7)})
              </span>
              <p className="mt-0.5 text-xl font-black text-primary">
                {monthlySummary?.attendanceRate == null
                  ? "—"
                  : `${monthlySummary.attendanceRate}%`}
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 p-2.5">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                At Risk Placements
              </span>
              <p className="mt-0.5 text-xl font-black text-warning">
                {atRiskStudents?.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-warning/10 p-2.5">
              <TrendingDown className="h-5 w-5 text-warning" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs panels */}
      {activeTab === "sheet" ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {/* Header toolbar */}
          <div className="flex flex-col items-center justify-between gap-3 border-b border-border p-5 md:flex-row">
            <div className="relative w-full md:w-72">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search student profile name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border-border bg-muted/30 pl-9 text-xs"
              />
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <Button
                onClick={handleMarkAllPresent}
                variant="outline"
                className="h-10 w-full cursor-pointer rounded-xl text-xs font-semibold hover:bg-muted md:w-auto"
              >
                Mark All Present
              </Button>
              <Button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-foreground/90 md:w-auto"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save Roster Attendance"}
              </Button>
            </div>
          </div>

          {/* Roster Marking Grid */}
          <div className="overflow-x-auto">
            {isLoadingSheet ? (
              <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                Loading class section roster...
              </div>
            ) : filteredSheet.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Users className="h-8 w-8 text-muted-foreground/50" />
                No student profiles found for this class section.
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <th className="px-6 py-3">Student Profile</th>
                    <th className="px-6 py-3">Gender</th>
                    <th className="px-6 py-3 text-center">Status Toggle</th>
                    <th className="px-6 py-3">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs text-foreground">
                  {filteredSheet.map((row) => {
                    const localRec = localRecords[row.studentProfileId] || {
                      status: "PRESENT",
                      remarks: "",
                    };
                    const isUnmarked = row.status === null;

                    return (
                      <tr
                        key={row.studentProfileId}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="flex items-center gap-2.5 px-6 py-4 font-bold">
                          {row.fullName}
                          {isUnmarked && (
                            <Badge className="rounded-md border-none bg-muted px-1 py-0 text-[8px] font-semibold text-muted-foreground">
                              Unmarked
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {row.gender}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((status) => {
                              const isSelected = localRec.status === status;
                              const variantColors = {
                                PRESENT: isSelected
                                  ? "bg-success text-success-foreground"
                                  : "bg-success/10 hover:bg-success/20 text-success",
                                LATE: isSelected
                                  ? "bg-warning text-warning-foreground"
                                  : "bg-warning/10 hover:bg-warning/20 text-warning",
                                EXCUSED: isSelected
                                  ? "bg-accent-foreground text-accent"
                                  : "bg-accent hover:bg-accent/80 text-accent-foreground",
                                ABSENT: isSelected
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-destructive/10 hover:bg-destructive/20 text-destructive",
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
                            className="h-8 rounded-lg border-border bg-muted/30 text-xs"
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
            <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Absence & Tardiness Daily Trends
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily absence and late counts recorded during this month.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!absenceTrends || absenceTrends.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                    No trend records available for this date range.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={absenceTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
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
                            borderRadius: "var(--radius)",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--popover)",
                            color: "var(--popover-foreground)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Line
                          type="monotone"
                          dataKey="absentCount"
                          name="Absences"
                          stroke="var(--destructive)"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="lateCount"
                          name="Lates"
                          stroke="var(--warning)"
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
            <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Monthly Status Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Breakdown distribution of all recorded statuses for this month.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!monthlySummary || monthlySummary.total === 0 ? (
                  <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
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
                            fill: "var(--success)",
                          },
                          {
                            name: "Late",
                            count: monthlySummary.breakdown.LATE,
                            fill: "var(--warning)",
                          },
                          {
                            name: "Excused",
                            count: monthlySummary.breakdown.EXCUSED,
                            fill: "var(--chart-2)",
                          },
                          {
                            name: "Absent",
                            count: monthlySummary.breakdown.ABSENT,
                            fill: "var(--destructive)",
                          },
                        ]}
                        barSize={32}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
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
                            borderRadius: "var(--radius)",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--popover)",
                            color: "var(--popover-foreground)",
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
            <Card className="h-full overflow-hidden rounded-3xl border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  At-Risk Students List
                </CardTitle>
                <CardDescription className="text-xs">
                  Students with attendance rates below 85% this year.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {!atRiskStudents || atRiskStudents.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 p-8 text-center text-xs text-muted-foreground">
                    <Sparkles className="h-8 w-8 text-success" />
                    All student profiles exceed the 85% attendance standard!
                  </div>
                ) : (
                  <div className="max-h-[500px] space-y-3.5 overflow-y-auto pr-1">
                    {atRiskStudents.map((row) => (
                      <div
                        key={row.studentProfileId}
                        className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/50 p-3.5"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-foreground">
                            {row.fullName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                            <span>{row.classSectionName}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
                            <span className="font-bold text-destructive">
                              {row.absentCount} Absences
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-destructive">
                            {row.attendanceRate}%
                          </span>
                          <p className="text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
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
