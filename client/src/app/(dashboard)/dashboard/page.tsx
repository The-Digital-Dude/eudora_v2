"use client";

import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
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
import {
  useGetCampusesQuery,
  useGetDashboardSnapshotQuery,
  useGetProgramsQuery,
  useGetUsersQuery,
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

  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  const isTeacher = userRoles.includes("TEACHER");
  const isStudent = userRoles.includes("USER") && user?.studentProfile;
  const isGuardian = userRoles.includes("GUARDIAN") && user?.guardianProfile;

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Queries
  const { data: campusesData } = useGetCampusesQuery();
  const { data: programsData } = useGetProgramsQuery();
  const { data: usersData } = useGetUsersQuery();

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
        <div className="h-8 w-1/3 rounded-lg bg-neutral-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-neutral-100 dark:bg-zinc-900" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-neutral-50 dark:bg-zinc-900/50" />
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
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-rose-500/10 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent p-6 md:flex-row md:items-center md:p-8">
          <div>
            <h1 className="font-display text-2xl font-black text-neutral-800 dark:text-neutral-100">
              Welcome Back, {user.firstName || "Teacher"}!
            </h1>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Track active schedules, resolve grading backlogs, and complete daily attendance
              registers.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/homework">
              <Button
                size="sm"
                className="h-10 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900"
              >
                Grade Worksheets
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Timeline Schedule */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                    <Calendar className="h-4 w-4 text-rose-500" /> Today's Teaching Schedule
                  </CardTitle>
                  <CardDescription className="text-[10px] text-neutral-400">
                    Scheduled classroom lectures and subjects.
                  </CardDescription>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {todaySchedule.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-100 py-12 text-center text-xs text-neutral-400 dark:border-zinc-900">
                    No classes scheduled for today.
                  </div>
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
                        className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50 dark:border-zinc-900 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            {slot.courseClass?.name || "Subject Lecture"}
                          </span>
                          <p className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                            <Badge
                              variant="outline"
                              className="rounded border-neutral-200 bg-white px-1.5 py-0.5 text-[8px] text-neutral-500 uppercase"
                            >
                              {slot.classSection?.name}
                            </Badge>
                            <span>Room: {slot.room || "N/A"}</span>
                          </p>
                        </div>
                        <Badge className="rounded-lg bg-neutral-900 px-2 font-mono text-[9px] text-white hover:bg-neutral-900">
                          {startHours}:{startMins} - {endHours}:{endMins}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Ungraded submissions backlog */}
            <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                  <CheckSquare className="h-4 w-4 text-violet-500" /> Submissions Awaiting Grading (
                  {ungradedSubmissions.length})
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">
                  Students' solution uploads waiting for points assignment.
                </CardDescription>
              </div>

              <div className="space-y-3 pt-2">
                {ungradedSubmissions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-100 py-10 text-center text-xs text-neutral-400 dark:border-zinc-900">
                    All homework submissions graded! Good job.
                  </div>
                ) : (
                  ungradedSubmissions.map((sub: any, i: number) => (
                    <div
                      key={sub.id || i}
                      className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-3.5 text-xs dark:border-zinc-900 dark:bg-zinc-900/10"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">
                          {sub.studentProfile?.fullName}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          Submitted: {sub.homework?.title}
                        </p>
                      </div>
                      <Link href="/homework">
                        <Button
                          size="sm"
                          className="flex h-7 cursor-pointer items-center gap-1 rounded-lg bg-violet-600 px-3.5 text-[10px] font-semibold text-white hover:bg-violet-500"
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
            <Card className="space-y-4 rounded-3xl border-rose-100 bg-rose-50/30 p-5 shadow-sm dark:border-rose-950 dark:bg-rose-500/5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-500/10">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider text-rose-800 uppercase dark:text-rose-400">
                    Attendance Register Alerts
                  </h3>
                  <p className="mt-0.5 text-[10px] text-rose-700/80 dark:text-rose-400/80">
                    Classes requiring daily attendance marks today.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {attendanceTasks.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-[10px] font-bold text-emerald-800 dark:border-emerald-950 dark:bg-emerald-500/5 dark:text-emerald-400">
                    All classes marked for today.
                  </div>
                ) : (
                  attendanceTasks.map((task: any, i: number) => (
                    <div
                      key={task.classSectionId || i}
                      className="flex items-center justify-between rounded-2xl border border-rose-100 bg-white p-3 dark:border-rose-950/40 dark:bg-zinc-950"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                          {task.name}
                        </span>
                        <p className="text-[8px] text-neutral-400 uppercase dark:text-neutral-500">
                          {task.code}
                        </p>
                      </div>
                      <Link href="/attendance">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex h-7 cursor-pointer items-center gap-1 rounded-lg text-[9px] font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400"
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
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-violet-500/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent p-6 md:flex-row md:items-center md:p-8">
          <div>
            <h1 className="font-display text-2xl font-black text-neutral-800 dark:text-neutral-100">
              Welcome Back, {user.firstName || "Student"}!
            </h1>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Check your class slots, upload pending homework, and review graded feedback.
            </p>
          </div>
          <Link href="/homework">
            <Button
              size="sm"
              className="flex h-10 cursor-pointer items-center gap-1 rounded-xl border-none bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Submit Assignments <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Today's schedule */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                  <Calendar className="h-4 w-4 text-violet-500" /> Today's Class Schedule
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">
                  Class periods, subjects, and rooms for today.
                </CardDescription>
              </div>

              <div className="space-y-3 pt-2">
                {todaySchedule.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-100 py-12 text-center text-xs text-neutral-400 dark:border-zinc-900">
                    No classes scheduled for today.
                  </div>
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
                        className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50 dark:border-zinc-900 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            {slot.courseClass?.name || "Lecture Slot"}
                          </p>
                          <p className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <span>Room: {slot.room || "N/A"}</span>
                            <span>&bull;</span>
                            <span>Teacher: {slot.teacherProfile?.fullName || "Staff"}</span>
                          </p>
                        </div>
                        <Badge className="rounded-lg bg-neutral-900 px-2 font-mono text-[9px] text-white hover:bg-neutral-900">
                          {startHours}:{startMins} - {endHours}:{endMins}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Recent feedback comments */}
            <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                  <Award className="h-4 w-4 text-emerald-500" /> Recent Teacher Feedback
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">
                  Score comments and evaluation logs from teachers.
                </CardDescription>
              </div>

              <div className="space-y-4 pt-2">
                {recentFeedback.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-100 py-10 text-center text-xs text-neutral-400 dark:border-zinc-900">
                    No graded assignments feedback yet.
                  </div>
                ) : (
                  recentFeedback.map((sub: any, i: number) => (
                    <div
                      key={sub.id || i}
                      className="space-y-2 rounded-2xl border border-neutral-100 bg-neutral-50/30 p-4 dark:border-zinc-900 dark:bg-zinc-900/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          {sub.homework?.title}
                        </span>
                        <Badge className="rounded-lg border border-emerald-100 bg-emerald-50 text-[9px] font-bold text-emerald-600 hover:bg-emerald-50 dark:bg-emerald-500/10">
                          Score: {sub.pointsEarned} / {sub.homework?.maxPoints}
                        </Badge>
                      </div>
                      {sub.feedback ? (
                        <p className="text-[10px] text-neutral-500 italic dark:text-neutral-400">
                          &ldquo;{sub.feedback}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[10px] text-neutral-400 italic dark:text-neutral-500">
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
          <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                <BookOpen className="h-4 w-4 text-rose-500" /> Pending Homework Tasks (
                {pendingHomework.length})
              </CardTitle>
              <CardDescription className="text-[10px] text-neutral-400">
                Assigned course tasks awaiting solutions.
              </CardDescription>
            </div>

            <div className="space-y-3 pt-2">
              {pendingHomework.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-800 dark:border-emerald-950 dark:bg-emerald-500/5 dark:text-emerald-400">
                  All assignments completed!
                </div>
              ) : (
                pendingHomework.map((hw: any, i: number) => (
                  <div
                    key={hw.id || i}
                    className="flex flex-col justify-between space-y-2 rounded-2xl border border-neutral-200 bg-white p-3.5 transition-all hover:border-neutral-300 dark:border-zinc-800 dark:bg-zinc-900/20"
                  >
                    <div>
                      <span className="block text-[8px] font-bold text-neutral-400 uppercase dark:text-neutral-500">
                        {hw.courseName}
                      </span>
                      <h4 className="mt-0.5 line-clamp-1 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {hw.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between border-t border-dashed border-neutral-100 pt-1.5 text-[9px] dark:border-zinc-800">
                      <span className="font-semibold text-neutral-400">
                        Due: {new Date(hw.dueDate).toLocaleDateString()}
                      </span>
                      <Link href="/homework">
                        <Button
                          size="sm"
                          className="h-6 cursor-pointer rounded-lg bg-neutral-900 px-2.5 text-[9px] text-white hover:bg-neutral-800"
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
            <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
              <Users className="h-7 w-7 text-violet-500" />
              Guardian Portal Overview
            </h1>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Monitor active classroom timetables and check homework completion statuses for your
              children.
            </p>
          </div>
        </div>

        {/* Children selector tabs */}
        {children.length > 1 && (
          <div className="flex w-fit gap-2 rounded-2xl bg-neutral-100 p-1.5 dark:bg-zinc-900">
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
          <div className="rounded-3xl border border-dashed border-neutral-100 bg-neutral-50/50 py-16 text-center text-xs text-neutral-400 dark:border-zinc-900">
            No children profiles registered to your account.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Child daily schedule timeline */}
            <div className="space-y-4 lg:col-span-2">
              <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                    <Calendar className="h-4 w-4 text-violet-500" /> {activeChild.fullName}'s
                    Schedule Today
                  </CardTitle>
                  <CardDescription className="text-[10px] text-neutral-400">
                    Timetable scheduled lectures for today.
                  </CardDescription>
                </div>

                <div className="space-y-3 pt-2">
                  {activeChild.todaySchedule.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-100 py-10 text-center text-xs text-neutral-400 dark:border-zinc-900">
                      No classes scheduled for today.
                    </div>
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
                          className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-3.5 dark:border-zinc-900 dark:bg-zinc-900/10"
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                              {slot.courseClass?.name}
                            </p>
                            <p className="text-[9px] text-neutral-400">
                              Room: {slot.room || "N/A"}
                            </p>
                          </div>
                          <Badge className="rounded-lg bg-neutral-900 px-2 font-mono text-[9px] text-white hover:bg-neutral-900">
                            {startHours}:{startMins} - {endHours}:{endMins}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Child recent grades summary */}
              <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                    <Award className="h-4 w-4 text-emerald-500" /> Recent Coursework Evaluations
                  </CardTitle>
                  <CardDescription className="text-[10px] text-neutral-400">
                    Published scores and results.
                  </CardDescription>
                </div>

                <div className="space-y-3 pt-2">
                  {activeChild.recentGrades.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-100 py-10 text-center text-xs text-neutral-400 dark:border-zinc-900">
                      No grades published for this term yet.
                    </div>
                  ) : (
                    activeChild.recentGrades.map((grade: any, i: number) => (
                      <div
                        key={grade.id || i}
                        className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/30 p-3.5 text-xs dark:border-zinc-900 dark:bg-zinc-900/10"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {grade.title}
                          </p>
                          <p className="text-[9px] text-neutral-400 uppercase">{grade.category}</p>
                        </div>
                        <Badge className="rounded-lg border border-emerald-100 bg-emerald-50 text-[9px] font-bold text-emerald-600 hover:bg-emerald-50 dark:bg-emerald-500/10">
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
            <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-black text-neutral-800 uppercase dark:text-neutral-200">
                  <BookOpen className="h-4 w-4 text-rose-500" /> Homework Overview
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">
                  Completion logs and indicators.
                </CardDescription>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/10">
                  <span className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                    Pending Assignments
                  </span>
                  <p className="text-2xl font-black text-neutral-800 dark:text-neutral-100">
                    {activeChild.pendingHomeworkCount} Tasks
                  </p>
                  <p className="mt-1 text-[9px] text-neutral-500">
                    Requires student solution upload.
                  </p>
                </div>

                <Link href="/homework" className="block">
                  <Button className="h-10 w-full cursor-pointer rounded-xl bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800">
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
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            Operational Visibility & Academic Insight
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Real-time platform KPIs, academic trends, and operational reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/campuses">
            <Button className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 active:scale-98">
              <Plus className="h-4 w-4" /> Add Campus
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Snapshot metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance snapshot */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Daily Attendance Marks
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {markedClasses} / {totalStudents} Marked
              </CardTitle>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
              <span>{unmarkedClasses} students unmarked</span>
              <span>&bull;</span>
              <span className="font-bold text-rose-500">{absentCount} absent</span>
            </p>
          </CardContent>
        </Card>

        {/* Timetable occupied slots */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Timetable Scheduled Slots
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {occupancyCount} Active Slots
              </CardTitle>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" /> Running timetable sessions
            </p>
          </CardContent>
        </Card>

        {/* Homework due & ungraded submissions */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Homework Backlog
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {ungradedSubmissions} Ungraded
              </CardTitle>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] font-semibold text-neutral-500">
              <span>{dueToday} due today</span>
            </p>
          </CardContent>
        </Card>

        {/* Gradebook drafts */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Gradebook Drafts
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {draftEntries} Draft Grades
              </CardTitle>
            </div>
            <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] font-semibold text-rose-500">
              Requires teacher publish action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Central static Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Centers / Campuses */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Centers / Campuses
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {totalCampuses} Active
              </CardTitle>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
              <School className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" /> +1 new this month
            </p>
          </CardContent>
        </Card>

        {/* Students */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Students Enrolled
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                1,842
              </CardTitle>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" /> +12% increase
            </p>
          </CardContent>
        </Card>

        {/* Revenue (MTD) */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Revenue (MTD)
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                $178,560
              </CardTitle>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" /> +8% vs last month
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Overdue Balances
              </CardDescription>
              <CardTitle className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                $12,430
              </CardTitle>
            </div>
            <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
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
        <Card className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="font-display mb-4 text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Platform Operations & KPIs
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                System Health
              </span>
              <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                100% Operational
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                Operational Alerts
              </span>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                0 Active Alerts
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">User Growth</span>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                +15% week-over-week
              </p>
            </div>
            <div className="space-y-1 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                Programs Active
              </span>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {totalPrograms} Curriculums
              </p>
            </div>
          </div>
        </Card>

        {/* Real-time Audit logs */}
        <Card className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="font-display mb-4 text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Real-time Audit & Logs
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-50 pb-2 text-xs dark:border-zinc-900">
                <span className="font-mono text-neutral-500 dark:text-neutral-400">
                  GET /api/dashboard/snapshot
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10">
                  200 OK
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-50 pb-2 text-xs dark:border-zinc-900">
                <span className="font-mono text-neutral-500 dark:text-neutral-400">
                  POST /api/auth/login
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10">
                  200 OK
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-50 pb-2 text-xs dark:border-zinc-900">
                <span className="font-mono text-neutral-500 dark:text-neutral-400">
                  GET /api/users
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10">
                  200 OK
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/users"
            className="mt-4 flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
          >
            Manage users & permissions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {/* Operational report lists */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Operational Reports & Types
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Access deep analytical data, queues, and operational billing states.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {/* Timetable */}
          <Link href="/timetable">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 transition-all select-none hover:border-neutral-300 hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
                  <Calendar className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Timetable
                </h3>
                <p className="text-[10px] leading-snug text-neutral-400">
                  Weekly grids & slots schedule.
                </p>
              </div>
            </Card>
          </Link>

          {/* Attendance */}
          <Link href="/attendance">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 transition-all select-none hover:border-neutral-300 hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
                  <UserCheck className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Attendance
                </h3>
                <p className="text-[10px] leading-snug text-neutral-400">
                  Daily marking & reports.
                </p>
              </div>
            </Card>
          </Link>

          {/* Homework */}
          <Link href="/homework">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 transition-all select-none hover:border-neutral-300 hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Homework
                </h3>
                <p className="text-[10px] leading-snug text-neutral-400">
                  Distribute & submit tasks.
                </p>
              </div>
            </Card>
          </Link>

          {/* Gradebook */}
          <Link href="/gradebook">
            <Card className="flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 transition-all select-none hover:border-neutral-300 hover:shadow-md">
              <div className="space-y-2">
                <div className="w-fit rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
                  <Award className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Gradebook
                </h3>
                <p className="text-[10px] leading-snug text-neutral-400">
                  Courework ledger & transcripts.
                </p>
              </div>
            </Card>
          </Link>

          {/* Academic Reviews */}
          <Card className="flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 transition-all select-none hover:border-neutral-300 hover:shadow-md">
            <div className="space-y-2">
              <div className="w-fit rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Academic Reviews
              </h3>
              <p className="text-[10px] leading-snug text-neutral-400">Quality checks & reviews.</p>
            </div>
          </Card>

          {/* Progress Snapshots */}
          <Card className="flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 p-4 transition-all select-none hover:border-neutral-300 hover:shadow-md">
            <div className="space-y-2">
              <div className="w-fit rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Snapshots
              </h3>
              <p className="text-[10px] leading-snug text-neutral-400">
                Progress indicators charts.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
