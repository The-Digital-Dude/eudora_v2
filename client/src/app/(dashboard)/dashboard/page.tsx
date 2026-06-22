"use client";

import React from "react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import {
  useGetCampusesQuery,
  useGetProgramsQuery,
  useGetUsersQuery,
  useGetDashboardSnapshotQuery,
} from "@/features/dashboard/dashboardApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartAreaInteractive } from "./components/chart-area-interactive";
import {
  School,
  Users,
  CreditCard,
  Plus,
  AlertCircle,
  FileText,
  Clock,
  CheckSquare,
  Sparkles,
  BookOpen,
  Calendar,
  UserCheck,
  Award,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

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
    new Date().toISOString().split("T")[0]
  );

  // Queries
  const { data: campusesData } = useGetCampusesQuery();
  const { data: programsData } = useGetProgramsQuery();
  const { data: usersData } = useGetUsersQuery();

  const { data: snapshot, isLoading: isLoadingSnapshot } = useGetDashboardSnapshotQuery(
    selectedDate ? { date: selectedDate } : undefined
  );

  // Selected child state for guardians
  const [selectedChildIndex, setSelectedChildIndex] = React.useState<number>(0);

  const totalCampuses = campusesData?.total ?? campusesData?.items?.length ?? 24;
  const totalPrograms = programsData?.total ?? programsData?.items?.length ?? 0;

  // Loading skeleton
  if (isLoadingSnapshot) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="h-8 bg-neutral-200 dark:bg-zinc-800 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-neutral-100 dark:bg-zinc-900 rounded-3xl" />
          ))}
        </div>
        <div className="h-80 bg-neutral-50 dark:bg-zinc-900/50 rounded-3xl" />
      </div>
    );
  }

  // --- RENDER 1. TEACHER VIEW ---
  if (isTeacher) {
    const todaySchedule = snapshot?.todaySchedule || [];
    const attendanceTasks = snapshot?.attendanceTasks || [];
    const ungradedSubmissions = snapshot?.ungradedSubmissions || [];

    return (
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border border-rose-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-black text-neutral-800 dark:text-neutral-100 font-display">
              Welcome Back, {user.firstName || "Teacher"}!
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-lg leading-relaxed">
              Track active schedules, resolve grading backlogs, and complete daily attendance registers.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/homework">
              <Button size="sm" className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900">
                Grade Worksheets
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Schedule */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-500" /> Today's Teaching Schedule
                  </CardTitle>
                  <CardDescription className="text-[10px] text-neutral-400">Scheduled classroom lectures and subjects.</CardDescription>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {todaySchedule.length === 0 ? (
                  <div className="text-center py-12 text-xs text-neutral-400 border border-dashed border-neutral-100 rounded-2xl dark:border-zinc-900">
                    No classes scheduled for today.
                  </div>
                ) : (
                  todaySchedule.map((slot: any, i: number) => {
                    const startHours = Math.floor(slot.startTimeMinutes / 60).toString().padStart(2, "0");
                    const startMins = (slot.startTimeMinutes % 60).toString().padStart(2, "0");
                    const endHours = Math.floor(slot.endTimeMinutes / 60).toString().padStart(2, "0");
                    const endMins = (slot.endTimeMinutes % 60).toString().padStart(2, "0");

                    return (
                      <div
                        key={slot.id || i}
                        className="flex items-center justify-between p-4 bg-neutral-50/50 hover:bg-neutral-50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-900 rounded-2xl transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            {slot.courseClass?.name || "Subject Lecture"}
                          </span>
                          <p className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 rounded bg-white text-neutral-500 uppercase border-neutral-200">
                              {slot.classSection?.name}
                            </Badge>
                            <span>Room: {slot.room || "N/A"}</span>
                          </p>
                        </div>
                        <Badge className="font-mono text-[9px] bg-neutral-900 hover:bg-neutral-900 text-white rounded-lg px-2">
                          {startHours}:{startMins} - {endHours}:{endMins}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Ungraded submissions backlog */}
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
              <div>
                <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-violet-500" /> Submissions Awaiting Grading ({ungradedSubmissions.length})
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">Students' solution uploads waiting for points assignment.</CardDescription>
              </div>

              <div className="space-y-3 pt-2">
                {ungradedSubmissions.length === 0 ? (
                  <div className="text-center py-10 text-xs text-neutral-400 border border-dashed border-neutral-100 rounded-2xl dark:border-zinc-900">
                    All homework submissions graded! Good job.
                  </div>
                ) : (
                  ungradedSubmissions.map((sub: any, i: number) => (
                    <div
                      key={sub.id || i}
                      className="flex items-center justify-between p-3.5 bg-neutral-50/50 border border-neutral-100 dark:bg-zinc-900/10 dark:border-zinc-900 rounded-2xl text-xs"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">{sub.studentProfile?.fullName}</p>
                        <p className="text-[10px] text-neutral-400">Submitted: {sub.homework?.title}</p>
                      </div>
                      <Link href="/homework">
                        <Button size="sm" className="rounded-lg h-7 px-3.5 text-[10px] font-semibold flex items-center gap-1 bg-violet-600 text-white hover:bg-violet-500 cursor-pointer">
                          <Award className="w-3.5 h-3.5" /> Grade
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
            <Card className="rounded-3xl border-rose-100 bg-rose-50/30 dark:bg-rose-500/5 dark:border-rose-950 p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-500/10 text-rose-600 rounded-xl">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider">Attendance Register Alerts</h3>
                  <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">Classes requiring daily attendance marks today.</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {attendanceTasks.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-center text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/5 dark:border-emerald-950 dark:text-emerald-400">
                    All classes marked for today.
                  </div>
                ) : (
                  attendanceTasks.map((task: any, i: number) => (
                    <div
                      key={task.classSectionId || i}
                      className="p-3 bg-white border border-rose-100 dark:bg-zinc-950 dark:border-rose-950/40 rounded-2xl flex justify-between items-center"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200">{task.name}</span>
                        <p className="text-[8px] text-neutral-400 dark:text-neutral-500 uppercase">{task.code}</p>
                      </div>
                      <Link href="/attendance">
                        <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 flex items-center gap-1 cursor-pointer">
                          Mark <ChevronRight className="w-3 h-3" />
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
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent border border-violet-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-black text-neutral-800 dark:text-neutral-100 font-display">
              Welcome Back, {user.firstName || "Student"}!
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-lg leading-relaxed">
              Check your class slots, upload pending homework, and review graded feedback.
            </p>
          </div>
          <Link href="/homework">
            <Button size="sm" className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer bg-violet-600 hover:bg-violet-500 text-white border-none flex items-center gap-1">
              Submit Assignments <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's schedule */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
              <div>
                <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-violet-500" /> Today's Class Schedule
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">Class periods, subjects, and rooms for today.</CardDescription>
              </div>

              <div className="space-y-3 pt-2">
                {todaySchedule.length === 0 ? (
                  <div className="text-center py-12 text-xs text-neutral-400 border border-dashed border-neutral-100 rounded-2xl dark:border-zinc-900">
                    No classes scheduled for today.
                  </div>
                ) : (
                  todaySchedule.map((slot: any, i: number) => {
                    const startHours = Math.floor(slot.startTimeMinutes / 60).toString().padStart(2, "0");
                    const startMins = (slot.startTimeMinutes % 60).toString().padStart(2, "0");
                    const endHours = Math.floor(slot.endTimeMinutes / 60).toString().padStart(2, "0");
                    const endMins = (slot.endTimeMinutes % 60).toString().padStart(2, "0");

                    return (
                      <div
                        key={slot.id || i}
                        className="flex items-center justify-between p-4 bg-neutral-50/50 hover:bg-neutral-50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-900 rounded-2xl transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            {slot.courseClass?.name || "Lecture Slot"}
                          </p>
                          <p className="text-[10px] text-neutral-400 flex items-center gap-2">
                            <span>Room: {slot.room || "N/A"}</span>
                            <span>&bull;</span>
                            <span>Teacher: {slot.teacherProfile?.fullName || "Staff"}</span>
                          </p>
                        </div>
                        <Badge className="font-mono text-[9px] bg-neutral-900 hover:bg-neutral-900 text-white rounded-lg px-2">
                          {startHours}:{startMins} - {endHours}:{endMins}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Recent feedback comments */}
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
              <div>
                <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-500" /> Recent Teacher Feedback
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">Score comments and evaluation logs from teachers.</CardDescription>
              </div>

              <div className="space-y-4 pt-2">
                {recentFeedback.length === 0 ? (
                  <div className="text-center py-10 text-xs text-neutral-400 border border-dashed border-neutral-100 rounded-2xl dark:border-zinc-900">
                    No graded assignments feedback yet.
                  </div>
                ) : (
                  recentFeedback.map((sub: any, i: number) => (
                    <div
                      key={sub.id || i}
                      className="p-4 bg-neutral-50/30 border border-neutral-100 dark:bg-zinc-900/10 dark:border-zinc-900 rounded-2xl space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 text-xs">{sub.homework?.title}</span>
                        <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50 text-[9px] font-bold rounded-lg dark:bg-emerald-500/10">
                          Score: {sub.pointsEarned} / {sub.homework?.maxPoints}
                        </Badge>
                      </div>
                      {sub.feedback ? (
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 italic">
                          &ldquo;{sub.feedback}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">No comment feedback left.</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Pending assignments checklist */}
          <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
            <div>
              <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-rose-500" /> Pending Homework Tasks ({pendingHomework.length})
              </CardTitle>
              <CardDescription className="text-[10px] text-neutral-400">Assigned course tasks awaiting solutions.</CardDescription>
            </div>

            <div className="space-y-3 pt-2">
              {pendingHomework.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center text-xs font-bold text-emerald-800 dark:bg-emerald-500/5 dark:border-emerald-950 dark:text-emerald-400">
                  All assignments completed!
                </div>
              ) : (
                pendingHomework.map((hw: any, i: number) => (
                  <div
                    key={hw.id || i}
                    className="p-3.5 bg-white border border-neutral-200 hover:border-neutral-300 dark:bg-zinc-900/20 dark:border-zinc-800 rounded-2xl space-y-2 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[8px] font-bold uppercase text-neutral-400 dark:text-neutral-500 block">{hw.courseName}</span>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 line-clamp-1">{hw.title}</h4>
                    </div>
                    <div className="flex justify-between items-center text-[9px] pt-1.5 border-t border-dashed border-neutral-100 dark:border-zinc-800">
                      <span className="text-neutral-400 font-semibold">Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                      <Link href="/homework">
                        <Button size="sm" className="h-6 rounded-lg text-[9px] px-2.5 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer">
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
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-display flex items-center gap-2">
              <Users className="w-7 h-7 text-violet-500" />
              Guardian Portal Overview
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Monitor active classroom timetables and check homework completion statuses for your children.
            </p>
          </div>
        </div>

        {/* Children selector tabs */}
        {children.length > 1 && (
          <div className="flex gap-2 bg-neutral-100 dark:bg-zinc-900 p-1.5 rounded-2xl w-fit">
            {children.map((child: any, index: number) => (
              <Button
                key={child.studentId || index}
                variant={selectedChildIndex === index ? "default" : "ghost"}
                onClick={() => setSelectedChildIndex(index)}
                className="rounded-xl text-xs font-bold px-4 h-9 cursor-pointer"
              >
                {child.fullName}
              </Button>
            ))}
          </div>
        )}

        {/* Renders active child snapshot */}
        {!activeChild ? (
          <div className="text-center py-16 text-xs text-neutral-400 border border-dashed border-neutral-100 rounded-3xl dark:border-zinc-900 bg-neutral-50/50">
            No children profiles registered to your account.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Child daily schedule timeline */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-violet-500" /> {activeChild.fullName}'s Schedule Today
                  </CardTitle>
                  <CardDescription className="text-[10px] text-neutral-400">Timetable scheduled lectures for today.</CardDescription>
                </div>

                <div className="space-y-3 pt-2">
                  {activeChild.todaySchedule.length === 0 ? (
                    <div className="text-center py-10 text-xs text-neutral-400 border border-dashed border-neutral-100 rounded-2xl dark:border-zinc-900">
                      No classes scheduled for today.
                    </div>
                  ) : (
                    activeChild.todaySchedule.map((slot: any, i: number) => {
                      const startHours = Math.floor(slot.startTimeMinutes / 60).toString().padStart(2, "0");
                      const startMins = (slot.startTimeMinutes % 60).toString().padStart(2, "0");
                      const endHours = Math.floor(slot.endTimeMinutes / 60).toString().padStart(2, "0");
                      const endMins = (slot.endTimeMinutes % 60).toString().padStart(2, "0");

                      return (
                        <div
                          key={slot.id || i}
                          className="flex items-center justify-between p-3.5 bg-neutral-50/50 border border-neutral-100 dark:bg-zinc-900/10 dark:border-zinc-900 rounded-2xl"
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{slot.courseClass?.name}</p>
                            <p className="text-[9px] text-neutral-400">Room: {slot.room || "N/A"}</p>
                          </div>
                          <Badge className="font-mono text-[9px] bg-neutral-900 hover:bg-neutral-900 text-white rounded-lg px-2">
                            {startHours}:{startMins} - {endHours}:{endMins}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Child recent grades summary */}
              <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-500" /> Recent Coursework Evaluations
                  </CardTitle>
                  <CardDescription className="text-[10px] text-neutral-400">Published scores and results.</CardDescription>
                </div>

                <div className="space-y-3 pt-2">
                  {activeChild.recentGrades.length === 0 ? (
                    <div className="text-center py-10 text-xs text-neutral-400 border border-dashed border-neutral-100 rounded-2xl dark:border-zinc-900">
                      No grades published for this term yet.
                    </div>
                  ) : (
                    activeChild.recentGrades.map((grade: any, i: number) => (
                      <div
                        key={grade.id || i}
                        className="flex items-center justify-between p-3.5 bg-neutral-50/30 border border-neutral-100 dark:bg-zinc-900/10 dark:border-zinc-900 rounded-2xl text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">{grade.title}</p>
                          <p className="text-[9px] text-neutral-400 uppercase">{grade.category}</p>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50 text-[9px] font-bold rounded-lg dark:bg-emerald-500/10">
                          {grade.pointsEarned} / {grade.pointsPossible} pts ({Math.round(grade.percentage)}%)
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Child status card metrics */}
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-4">
              <div>
                <CardTitle className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-rose-500" /> Homework Overview
                </CardTitle>
                <CardDescription className="text-[10px] text-neutral-400">Completion logs and indicators.</CardDescription>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-neutral-50 border border-neutral-100 dark:bg-zinc-900/10 dark:border-zinc-900 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Pending Assignments</span>
                  <p className="text-2xl font-black text-neutral-800 dark:text-neutral-100">
                    {activeChild.pendingHomeworkCount} Tasks
                  </p>
                  <p className="text-[9px] text-neutral-500 mt-1">Requires student solution upload.</p>
                </div>

                <Link href="/homework" className="block">
                  <Button className="w-full rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 h-10 text-xs font-semibold cursor-pointer">
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
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 font-display">
            Operational Visibility & Academic Insight
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time platform KPIs, academic trends, and operational reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/campuses">
            <Button className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-98 flex items-center gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" /> Add Campus
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Snapshot metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance snapshot */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Daily Attendance Marks
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                {markedClasses} / {totalStudents} Marked
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-neutral-500 font-semibold flex items-center gap-1">
              <span>{unmarkedClasses} students unmarked</span>
              <span>&bull;</span>
              <span className="text-rose-500 font-bold">{absentCount} absent</span>
            </p>
          </CardContent>
        </Card>

        {/* Timetable occupied slots */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Timetable Scheduled Slots
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                {occupancyCount} Active Slots
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Running timetable sessions
            </p>
          </CardContent>
        </Card>

        {/* Homework due & ungraded submissions */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Homework Backlog
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                {ungradedSubmissions} Ungraded
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
              <FileText className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-neutral-500 font-semibold">
              <span>{dueToday} due today</span>
            </p>
          </CardContent>
        </Card>

        {/* Gradebook drafts */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Gradebook Drafts
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                {draftEntries} Draft Grades
              </CardTitle>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-rose-500 font-semibold">
              Requires teacher publish action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Central static Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Centers / Campuses */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Centers / Campuses
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                {totalCampuses} Active
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
              <School className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +1 new this month
            </p>
          </CardContent>
        </Card>

        {/* Students */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Students Enrolled
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                1,842
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12% increase
            </p>
          </CardContent>
        </Card>

        {/* Revenue (MTD) */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Revenue (MTD)
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                $178,560
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +8% vs last month
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Overdue Balances
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100">
                $12,430
              </CardTitle>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> -4% reduction
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
        <Card className="border border-neutral-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-3xl p-6 bg-white dark:bg-zinc-950 dark:border-zinc-800">
          <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display mb-4">
            Platform Operations & KPIs
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-zinc-900/40 rounded-2xl border border-neutral-100 dark:border-zinc-900 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">System Health</span>
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                100% Operational
              </p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-zinc-900/40 rounded-2xl border border-neutral-100 dark:border-zinc-900 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Operational Alerts</span>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">0 Active Alerts</p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-zinc-900/40 rounded-2xl border border-neutral-100 dark:border-zinc-900 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">User Growth</span>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">+15% week-over-week</p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-zinc-900/40 rounded-2xl border border-neutral-100 dark:border-zinc-900 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Programs Active</span>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{totalPrograms} Curriculums</p>
            </div>
          </div>
        </Card>

        {/* Real-time Audit logs */}
        <Card className="border border-neutral-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-3xl p-6 bg-white dark:bg-zinc-950 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display mb-4">
              Real-time Audit & Logs
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs border-b border-neutral-50 dark:border-zinc-900 pb-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-mono">GET /api/dashboard/snapshot</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">200 OK</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-neutral-50 dark:border-zinc-900 pb-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-mono">POST /api/auth/login</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">200 OK</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-neutral-50 dark:border-zinc-900 pb-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-mono">GET /api/users</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">200 OK</span>
              </div>
            </div>
          </div>
          <Link href="/users" className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-4 flex items-center gap-1 hover:underline">
            Manage users & permissions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>

      {/* Operational report lists */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50 font-display">
            Operational Reports & Types
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Access deep analytical data, queues, and operational billing states.
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* Timetable */}
          <Link href="/timetable">
            <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none h-full">
              <div className="space-y-2">
                <div className="p-2 w-fit bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Timetable</h3>
                <p className="text-[10px] text-neutral-400 leading-snug">Weekly grids & slots schedule.</p>
              </div>
            </Card>
          </Link>

          {/* Attendance */}
          <Link href="/attendance">
            <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none h-full">
              <div className="space-y-2">
                <div className="p-2 w-fit bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Attendance</h3>
                <p className="text-[10px] text-neutral-400 leading-snug">Daily marking & reports.</p>
              </div>
            </Card>
          </Link>

          {/* Homework */}
          <Link href="/homework">
            <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none h-full">
              <div className="space-y-2">
                <div className="p-2 w-fit bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Homework</h3>
                <p className="text-[10px] text-neutral-400 leading-snug">Distribute & submit tasks.</p>
              </div>
            </Card>
          </Link>

          {/* Gradebook */}
          <Link href="/gradebook">
            <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none h-full">
              <div className="space-y-2">
                <div className="p-2 w-fit bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Gradebook</h3>
                <p className="text-[10px] text-neutral-400 leading-snug">Courework ledger & transcripts.</p>
              </div>
            </Card>
          </Link>

          {/* Academic Reviews */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none h-full">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Academic Reviews</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Quality checks & reviews.</p>
            </div>
          </Card>

          {/* Progress Snapshots */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none h-full">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 dark:bg-zinc-900 rounded-xl text-neutral-700 dark:text-neutral-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Snapshots</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Progress indicators charts.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
