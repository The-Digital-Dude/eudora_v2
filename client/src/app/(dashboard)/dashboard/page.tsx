"use client";

import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronRight,
  CreditCard,
  FileText,
  Plus,
  School,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useGetCampusesQuery,
  useGetDashboardSnapshotQuery,
  useGetProgramsQuery,
} from "@/features/dashboard/dashboardApi";
import { useAppSelector } from "@/store/hooks";

import { ChartAreaInteractive } from "./components/chart-area-interactive";

export default function DashboardOverview() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  // Resolve user roles list
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

  const isTeacher = userRoles.includes("TEACHER");
  const isStudent = userRoles.includes("USER") && user?.studentProfile;
  const isGuardian = userRoles.includes("GUARDIAN") && user?.guardianProfile;

  // Selected date state (defaults to today)
  const [selectedDate] = React.useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Queries
  const { data: campusesData } = useGetCampusesQuery();
  const { data: programsData } = useGetProgramsQuery();

  const { data: snapshot, isLoading: isLoadingSnapshot } = useGetDashboardSnapshotQuery(
    selectedDate ? { date: selectedDate } : undefined,
  );

  // Selected child state for guardians
  const [selectedChildIndex, setSelectedChildIndex] = React.useState<number>(0);

  const totalCampuses = campusesData?.total ?? campusesData?.items?.length ?? 24;
  const totalPrograms = programsData?.total ?? programsData?.items?.length ?? 0;

  // Loading skeleton
  if (isLoadingSnapshot) {
    return (
      <div className="animate-pulse space-y-6 py-6">
        <div className="h-8 w-1/3 rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-muted" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-muted/50" />
      </div>
    );
  }

  // --- RENDER 1. TEACHER VIEW ---
  if (isTeacher) {
    const todaySchedule = snapshot?.todaySchedule || [];
    const attendanceTasks = snapshot?.attendanceTasks || [];
    const ungradedSubmissions = snapshot?.ungradedSubmissions || [];

    return (
      <div className="animate-fade-in space-y-8 pb-12">
        {/* Banner */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:flex-row md:items-center md:p-8">
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">
              Welcome Back, {user.firstName || "Teacher"}!
            </h1>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
              Track active schedules, resolve grading backlogs, and complete daily attendance
              registers.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/homework">
              <Button
                size="sm"
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
              >
                Grade Worksheets
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Timeline Schedule */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                    <Calendar className="h-4 w-4 text-primary" /> Today&apos;s Teaching Schedule
                  </CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground">
                    Scheduled classroom lectures and subjects.
                  </CardDescription>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {todaySchedule.length === 0 ? (
                  <EmptyState title="No data yet" description="Data will appear here once available." />
                ) : (
                  todaySchedule.map((slot: any, i: number) => {
                    const startHours = Math.floor(slot.startTimeMinutes / 60)
                      .toString()
                      .padStart(2, "0");
                    const startMins = (slot.startTimeMinutes % 60).toString().padStart(2, "0");
                    const endHours = Math.floor(slot.endTimeMinutes / 60)
                      .toString()
                      .padStart(2, "0");
                    const endMins = (slot.endTimeMinutes % 60).toString().padStart(2, "0");

                    return (
                      <div
                        key={slot.id || i}
                        className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-foreground">
                            {slot.courseClass?.name || "Subject Lecture"}
                          </span>
                          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Badge
                              variant="outline"
                              className="rounded border-border bg-card px-1.5 py-0.5 text-[8px] text-muted-foreground uppercase"
                            >
                              {slot.classSection?.name}
                            </Badge>
                            <span>Room: {slot.room || "N/A"}</span>
                          </p>
                        </div>
                        <Badge className="rounded-lg bg-primary px-2 font-mono text-[9px] text-primary-foreground hover:bg-primary/90">
                          {startHours}:{startMins} - {endHours}:{endMins}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Ungraded submissions backlog */}
            <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                  <CheckSquare className="h-4 w-4 text-primary" /> Submissions Awaiting Grading (
                  {ungradedSubmissions.length})
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Students&apos; solution uploads waiting for points assignment.
                </CardDescription>
              </div>

              <div className="space-y-3 pt-2">
                {ungradedSubmissions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                    All homework submissions graded! Good job.
                  </div>
                ) : (
                  ungradedSubmissions.map((sub: any, i: number) => (
                    <div
                      key={sub.id || i}
                      className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-3.5 text-xs"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">
                          {sub.studentProfile?.fullName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Submitted: {sub.homework?.title}
                        </p>
                      </div>
                      <Link href="/homework">
                        <Button
                          size="sm"
                          className="flex h-7 cursor-pointer items-center gap-1 rounded-lg bg-primary px-3.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Award className="h-3.5 w-3.5" /> Grade
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Column details */}
          <div className="space-y-6">
            {/* Daily Attendance Warnings */}
            <Card className="space-y-4 rounded-3xl border-destructive/10 bg-destructive/5 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider text-destructive uppercase">
                    Attendance Register Alerts
                  </h3>
                  <p className="mt-0.5 text-[10px] text-destructive/70">
                    Classes requiring daily attendance marks today.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {attendanceTasks.length === 0 ? (
                  <div className="rounded-2xl border border-success/20 bg-success/10 p-3 text-center text-[10px] font-bold text-success">
                    All classes marked for today.
                  </div>
                ) : (
                  attendanceTasks.map((task: any, i: number) => (
                    <div
                      key={task.classSectionId || i}
                      className="flex items-center justify-between rounded-2xl border border-destructive/10 bg-card p-3"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-foreground">
                          {task.name}
                        </span>
                        <p className="text-[8px] text-muted-foreground uppercase">
                          {task.code}
                        </p>
                      </div>
                      <Link href="/attendance">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex h-7 cursor-pointer items-center gap-1 rounded-lg text-[9px] font-bold text-destructive hover:bg-destructive/10"
                        >
                          Mark <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 2. STUDENT VIEW ---
  if (isStudent) {
    const todaySchedule = snapshot?.todaySchedule || [];
    const pendingHomework = snapshot?.pendingHomework || [];
    const recentFeedback = snapshot?.recentFeedback || [];

    return (
      <div className="animate-fade-in space-y-8 pb-12">
        {/* Banner */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:flex-row md:items-center md:p-8">
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">
              Welcome Back, {user.firstName || "Student"}!
            </h1>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
              Check your class slots, upload pending homework, and review graded feedback.
            </p>
          </div>
          <Link href="/homework">
            <Button
              size="sm"
              className="flex h-10 cursor-pointer items-center gap-1 rounded-xl border-none bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Submit Assignments <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Today's schedule */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                  <Calendar className="h-4 w-4 text-primary" /> Today&apos;s Class Schedule
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Class periods, subjects, and rooms for today.
                </CardDescription>
              </div>

              <div className="space-y-3 pt-2">
                {todaySchedule.length === 0 ? (
                  <EmptyState title="No data yet" description="Data will appear here once available." />
                ) : (
                  todaySchedule.map((slot: any, i: number) => {
                    const startHours = Math.floor(slot.startTimeMinutes / 60)
                      .toString()
                      .padStart(2, "0");
                    const startMins = (slot.startTimeMinutes % 60).toString().padStart(2, "0");
                    const endHours = Math.floor(slot.endTimeMinutes / 60)
                      .toString()
                      .padStart(2, "0");
                    const endMins = (slot.endTimeMinutes % 60).toString().padStart(2, "0");

                    return (
                      <div
                        key={slot.id || i}
                        className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">
                            {slot.courseClass?.name || "Lecture Slot"}
                          </p>
                          <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Room: {slot.room || "N/A"}</span>
                            <span>&bull;</span>
                            <span>Teacher: {slot.teacherProfile?.fullName || "Staff"}</span>
                          </p>
                        </div>
                        <Badge className="rounded-lg bg-primary px-2 font-mono text-[9px] text-primary-foreground hover:bg-primary/90">
                          {startHours}:{startMins} - {endHours}:{endMins}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Recent feedback comments */}
            <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                  <Award className="h-4 w-4 text-success" /> Recent Teacher Feedback
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Score comments and evaluation logs from teachers.
                </CardDescription>
              </div>

              <div className="space-y-4 pt-2">
                {recentFeedback.length === 0 ? (
                  <EmptyState title="No data yet" description="Data will appear here once available." />
                ) : (
                  recentFeedback.map((sub: any, i: number) => (
                    <div
                      key={sub.id || i}
                      className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {sub.homework?.title}
                        </span>
                        <Badge className="rounded-lg border border-success/20 bg-success/10 text-[9px] font-bold text-success hover:bg-success/10">
                          Score: {sub.pointsEarned} / {sub.homework?.maxPoints}
                        </Badge>
                      </div>
                      {sub.feedback ? (
                        <p className="text-[10px] text-muted-foreground italic">
                          &ldquo;{sub.feedback}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                          No comment feedback left.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Pending assignments checklist */}
          <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                <BookOpen className="h-4 w-4 text-destructive" /> Pending Homework Tasks (
                {pendingHomework.length})
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">
                Assigned course tasks awaiting solutions.
              </CardDescription>
            </div>

            <div className="space-y-3 pt-2">
              {pendingHomework.length === 0 ? (
                <div className="rounded-2xl border border-success/20 bg-success/10 p-4 text-center text-xs font-bold text-success">
                  All assignments completed!
                </div>
              ) : (
                pendingHomework.map((hw: any, i: number) => (
                  <div
                    key={hw.id || i}
                    className="flex flex-col justify-between space-y-2 rounded-2xl border border-border bg-card p-3.5 transition-all hover:border-border"
                  >
                    <div>
                      <span className="block text-[8px] font-bold text-muted-foreground uppercase">
                        {hw.courseName}
                      </span>
                      <h4 className="mt-0.5 line-clamp-1 text-xs font-bold text-foreground">
                        {hw.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5 text-[9px]">
                      <span className="font-semibold text-muted-foreground">
                        Due: {new Date(hw.dueDate).toLocaleDateString()}
                      </span>
                      <Link href="/homework">
                        <Button
                          size="sm"
                          className="h-6 cursor-pointer rounded-lg bg-primary px-2.5 text-[9px] text-primary-foreground hover:bg-foreground/90"
                        >
                          Submit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- RENDER 3. GUARDIAN VIEW ---
  if (isGuardian) {
    const children = snapshot?.children || [];
    const activeChild = children[selectedChildIndex];

    return (
      <div className="animate-fade-in space-y-8 pb-12">
        {/* Banner */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
              <Users className="h-7 w-7 text-primary" />
              Guardian Portal Overview
            </h1>
            <p className="text-xs font-medium text-muted-foreground">
              Monitor active classroom timetables and check homework completion statuses for your
              children.
            </p>
          </div>
        </div>

        {/* Children selector tabs */}
        {children.length > 1 && (
          <div className="flex w-fit gap-2 rounded-2xl bg-muted p-1.5">
            {children.map((child: any, index: number) => (
              <Button
                key={child.studentId || index}
                variant={selectedChildIndex === index ? "default" : "ghost"}
                onClick={() => setSelectedChildIndex(index)}
                className="h-9 cursor-pointer rounded-xl px-4 text-xs font-bold"
              >
                {child.fullName}
              </Button>
            ))}
          </div>
        )}

        {/* Renders active child snapshot */}
        {!activeChild ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 py-16 text-center text-xs text-muted-foreground">
            No children profiles registered to your account.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Child daily schedule timeline */}
            <div className="space-y-4 lg:col-span-2">
              <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                    <Calendar className="h-4 w-4 text-primary" /> {activeChild.fullName}&apos;s
                    Schedule Today
                  </CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground">
                    Timetable scheduled lectures for today.
                  </CardDescription>
                </div>

                <div className="space-y-3 pt-2">
                  {activeChild.todaySchedule.length === 0 ? (
                    <EmptyState title="No data yet" description="Data will appear here once available." />
                  ) : (
                    activeChild.todaySchedule.map((slot: any, i: number) => {
                      const startHours = Math.floor(slot.startTimeMinutes / 60)
                        .toString()
                        .padStart(2, "0");
                      const startMins = (slot.startTimeMinutes % 60).toString().padStart(2, "0");
                      const endHours = Math.floor(slot.endTimeMinutes / 60)
                        .toString()
                        .padStart(2, "0");
                      const endMins = (slot.endTimeMinutes % 60).toString().padStart(2, "0");

                      return (
                        <div
                          key={slot.id || i}
                          className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-3.5"
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">
                              {slot.courseClass?.name}
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              Room: {slot.room || "N/A"}
                            </p>
                          </div>
                          <Badge className="rounded-lg bg-primary px-2 font-mono text-[9px] text-primary-foreground hover:bg-primary/90">
                            {startHours}:{startMins} - {endHours}:{endMins}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Child recent grades summary */}
              <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                    <Award className="h-4 w-4 text-success" /> Recent Coursework Evaluations
                  </CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground">
                    Published scores and results.
                  </CardDescription>
                </div>

                <div className="space-y-3 pt-2">
                  {activeChild.recentGrades.length === 0 ? (
                    <EmptyState title="No data yet" description="Data will appear here once available." />
                  ) : (
                    activeChild.recentGrades.map((grade: any, i: number) => (
                      <div
                        key={grade.id || i}
                        className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-3.5 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">
                            {grade.title}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase">{grade.category}</p>
                        </div>
                        <Badge className="rounded-lg border border-success/20 bg-success/10 text-[9px] font-bold text-success hover:bg-success/10">
                          {grade.pointsEarned} / {grade.pointsPossible} pts (
                          {Math.round(grade.percentage)}%)
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Child status card metrics */}
            <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-foreground uppercase">
                  <BookOpen className="h-4 w-4 text-destructive" /> Homework Overview
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Completion logs and indicators.
                </CardDescription>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1 rounded-2xl border border-border bg-muted/50 p-4">
                  <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                    Pending Assignments
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {activeChild.pendingHomeworkCount} Tasks
                  </p>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    Requires student solution upload.
                  </p>
                </div>

                <Link href="/homework" className="block">
                  <Button className="h-10 w-full cursor-pointer rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-foreground/90">
                    Review Homework Portal
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER 4. ADMIN VIEW (Modified top half snapshots, keeping existing bottom half lists) ---
  const occupancyCount = snapshot?.timetableOccupancy?.activeSlotsCount ?? 0;
  const markedClasses = snapshot?.attendanceSnapshot?.markedCount ?? 0;
  const totalStudents = snapshot?.attendanceSnapshot?.totalStudents ?? 0;
  const unmarkedClasses = snapshot?.attendanceSnapshot?.unmarkedCount ?? 0;
  const absentCount = snapshot?.attendanceSnapshot?.absentCount ?? 0;
  const dueToday = snapshot?.homeworkSnapshot?.dueToday ?? 0;
  const ungradedSubmissions = snapshot?.homeworkSnapshot?.ungradedSubmissions ?? 0;
  const draftEntries = snapshot?.gradebookSnapshot?.draftEntries ?? 0;

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Operational Visibility & Academic Insight
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time platform KPIs, academic trends, and operational reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/campuses">
            <Button className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-foreground/90 active:scale-98">
              <Plus className="h-4 w-4" /> Add Campus
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Snapshot metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance snapshot */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Daily Attendance Marks
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                {markedClasses} / {totalStudents} Marked
              </CardTitle>
            </div>
            <div className="rounded-xl bg-muted p-3 text-foreground">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <span>{unmarkedClasses} students unmarked</span>
              <span>&bull;</span>
              <span className="font-bold text-destructive">{absentCount} absent</span>
            </p>
          </CardContent>
        </Card>

        {/* Timetable occupied slots */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Timetable Scheduled Slots
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                {occupancyCount} Active Slots
              </CardTitle>
            </div>
            <div className="rounded-xl bg-muted p-3 text-foreground">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3.5 w-3.5" /> Running timetable sessions
            </p>
          </CardContent>
        </Card>

        {/* Homework due & ungraded submissions */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Homework Backlog
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                {ungradedSubmissions} Ungraded
              </CardTitle>
            </div>
            <div className="rounded-xl bg-muted p-3 text-foreground">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] font-semibold text-muted-foreground">
              <span>{dueToday} due today</span>
            </p>
          </CardContent>
        </Card>

        {/* Gradebook drafts */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Gradebook Drafts
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                {draftEntries} Draft Grades
              </CardTitle>
            </div>
            <div className="rounded-xl bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] font-semibold text-destructive">
              Requires teacher publish action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Central static Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Centers / Campuses */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Centers / Campuses
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                {totalCampuses} Active
              </CardTitle>
            </div>
            <div className="rounded-xl bg-muted p-3 text-foreground">
              <School className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3.5 w-3.5" /> +1 new this month
            </p>
          </CardContent>
        </Card>

        {/* Students */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Students Enrolled
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                1,842
              </CardTitle>
            </div>
            <div className="rounded-xl bg-muted p-3 text-foreground">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3.5 w-3.5" /> +12% increase
            </p>
          </CardContent>
        </Card>

        {/* Revenue (MTD) */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Revenue (MTD)
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                $178,560
              </CardTitle>
            </div>
            <div className="rounded-xl bg-muted p-3 text-foreground">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3.5 w-3.5" /> +8% vs last month
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Overdue Balances
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                $12,430
              </CardTitle>
            </div>
            <div className="rounded-xl bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3.5 w-3.5" /> -4% reduction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment and Revenue Trends Visuals */}
      <div className="grid gap-6 md:grid-cols-1">
        <ChartAreaInteractive />
      </div>

      {/* Admin Dashboard Operations items */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl border border-border/60 bg-card p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <h2 className="font-display mb-4 text-sm font-bold tracking-tight text-foreground">
            Platform Operations & KPIs
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 rounded-2xl border border-border bg-muted/50 p-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                System Health
              </span>
              <p className="flex items-center gap-1 text-xs font-semibold text-success">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                100% Operational
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-border bg-muted/50 p-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Operational Alerts
              </span>
              <p className="text-xs font-semibold text-foreground">
                0 Active Alerts
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-border bg-muted/50 p-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">User Growth</span>
              <p className="text-xs font-semibold text-foreground">
                +15% week-over-week
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-border bg-muted/50 p-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Programs Active
              </span>
              <p className="text-xs font-semibold text-foreground">
                {totalPrograms} Curriculums
              </p>
            </div>
          </div>
        </Card>

        {/* Real-time Audit logs */}
        <Card className="flex flex-col justify-between rounded-3xl border border-border/60 bg-card p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div>
            <h2 className="font-display mb-4 text-sm font-bold tracking-tight text-foreground">
              Real-time Audit & Logs
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/30 pb-2 text-xs">
                <span className="font-mono text-muted-foreground">
                  GET /api/dashboard/snapshot
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  200 OK
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/30 pb-2 text-xs">
                <span className="font-mono text-muted-foreground">
                  POST /api/auth/login
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  200 OK
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/30 pb-2 text-xs">
                <span className="font-mono text-muted-foreground">
                  GET /api/users
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  200 OK
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/users"
            className="mt-4 flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            Manage users & permissions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {/* Operational report lists */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-foreground">
            Operational Reports & Types
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Access deep analytical data, queues, and operational billing states.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {/* Timetable */}
          <Link href="/timetable">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-border/60 p-4 transition-all select-none hover:border-border hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-muted p-2 text-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">
                  Timetable
                </h3>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Weekly grids & slots schedule.
                </p>
              </div>
            </Card>
          </Link>

          {/* Attendance */}
          <Link href="/attendance">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-border/60 p-4 transition-all select-none hover:border-border hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-muted p-2 text-foreground">
                  <UserCheck className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">
                  Attendance
                </h3>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Daily marking & reports.
                </p>
              </div>
            </Card>
          </Link>

          {/* Homework */}
          <Link href="/homework">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-border/60 p-4 transition-all select-none hover:border-border hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-muted p-2 text-foreground">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">
                  Homework
                </h3>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Distribute & submit tasks.
                </p>
              </div>
            </Card>
          </Link>

          {/* Gradebook */}
          <Link href="/gradebook">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-border/60 p-4 transition-all select-none hover:border-border hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-muted p-2 text-foreground">
                  <Award className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">
                  Gradebook
                </h3>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Courework ledger & transcripts.
                </p>
              </div>
            </Card>
          </Link>

          {/* Academic Reviews */}
          <Card className="flex h-full flex-col justify-between rounded-2xl border border-border/60 p-4 transition-all select-none hover:border-border hover:shadow-md">
            <div className="space-y-2">
              <div className="w-fit rounded-xl bg-muted p-2 text-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-foreground">
                Academic Reviews
              </h3>
              <p className="text-[10px] leading-snug text-muted-foreground">Quality checks & reviews.</p>
            </div>
          </Card>

          {/* Progress Snapshots */}
          <Card className="flex h-full flex-col justify-between rounded-2xl border border-border/60 p-4 transition-all select-none hover:border-border hover:shadow-md">
            <div className="space-y-2">
              <div className="w-fit rounded-xl bg-muted p-2 text-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-foreground">
                Snapshots
              </h3>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Progress indicators charts.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

