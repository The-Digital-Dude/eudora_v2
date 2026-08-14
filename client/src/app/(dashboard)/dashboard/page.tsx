"use client";

import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
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

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetDashboardSnapshotQuery,
  useGetProgramsQuery,
} from "@/features/dashboard/dashboardApi";

import { ChartAreaInteractive } from "./components/chart-area-interactive";
import { ChartBarHomework } from "./components/chart-bar-homework";
import { ChartDonutAttendance } from "./components/chart-donut-attendance";

export default function DashboardOverview() {
  // Selected date state (defaults to today)
  const [selectedDate] = React.useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Queries
  const { data: programsData } = useGetProgramsQuery();

  const { data: snapshot, isLoading: isLoadingSnapshot } = useGetDashboardSnapshotQuery(
    selectedDate ? { date: selectedDate } : undefined,
  );

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

  // ADMIN VIEW — the only view this route renders. It previously carried teacher/student/guardian
  // branches too, but /dashboard is gated to ADMIN/SUPER_ADMIN by the nav-config route guard, so
  // those branches were unreachable; each role has its own portal (/teacher, /student, /parent).
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
          <Link href="/programs/create">
            <Button className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-foreground/90 active:scale-98">
              <Plus className="h-4 w-4" /> Add Program
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

      {/* Academic Operations Visuals */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartBarHomework />
        </div>
        <ChartDonutAttendance />
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

