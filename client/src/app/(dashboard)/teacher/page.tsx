"use client";

import { format } from "date-fns";
import { BookOpen, Calendar, ClipboardCheck, ExternalLink,Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import React, { useEffect,useState } from "react";

import { useGetDashboardSnapshotQuery } from "@/features/dashboard/dashboardApi";
import { MessagingCenter } from "@/features/messaging/components/MessagingCenter";
import { useGetTeacherClassesQuery } from "@/features/teacher/teacherPortalApi";
import { useAppSelector } from "@/store/hooks";

import { ClassesOverview } from "./components/classes-overview";
import { PerformanceAlerts } from "./components/performance-alerts";
import { QuickAttendance } from "./components/quick-attendance";

export default function TeacherPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const currentUserId = user?.id;

  const [activeSection, setActiveSection] = useState<"attendance" | "grading" | "messages">("attendance");
  const [activeClassId, setActiveClassId] = useState<string>("");

  // Query assigned classes
  const { data: classes = [], isLoading: isClassesLoading, refetch: refetchClasses } = useGetTeacherClassesQuery();

  // Query snapshot (schedule, grading tasks)
  const { data: snapshot, isLoading: isSnapshotLoading, refetch: refetchSnapshot } = useGetDashboardSnapshotQuery();

  // Automatically select the first class section as active if none selected
  useEffect(() => {
    if (classes.length > 0 && !activeClassId) {
      setActiveClassId(classes[0].classSectionId);
    }
  }, [classes, activeClassId]);

  const isLoading = isClassesLoading || isSnapshotLoading;

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading Teacher Command Center...</p>
      </div>
    );
  }

  const todaySchedule = snapshot?.todaySchedule || [];
  const ungradedSubmissions = snapshot?.ungradedSubmissions || [];

  const handleAttendanceSuccess = () => {
    // Refresh assigned classes so marked status updates instantly
    refetchClasses();
    refetchSnapshot();
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Teacher Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.firstName || user?.name || "Teacher"}. Manage your classes, record attendance, and communicate with parents.
          </p>
        </div>

        {/* Global Section Tabs */}
        <div className="inline-flex rounded-xl bg-muted p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveSection("attendance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "attendance"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            Attendance
          </button>
          <button
            onClick={() => setActiveSection("grading")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "grading"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Grading & Schedule
          </button>
          <button
            onClick={() => setActiveSection("messages")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "messages"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Parent Messages
          </button>
        </div>
      </div>

      {activeSection === "attendance" && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Assigned Classes
            </h3>
            <ClassesOverview
              classes={classes}
              activeClassId={activeClassId}
              onSelectClass={setActiveClassId}
              isLoading={isClassesLoading}
            />
          </div>

          {/* Quick roll-call selector */}
          {activeClassId && (
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Quick Roll-Call Marking
              </h3>
              <QuickAttendance
                classSectionId={activeClassId}
                onSuccess={handleAttendanceSuccess}
              />
            </div>
          )}
        </div>
      )}

      {activeSection === "grading" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Today's Schedule Slot list (col-span-1) */}
          <div className="space-y-6 lg:col-span-1">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Today&apos;s Schedule
              </h3>
              <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl shadow-black/5/50/20 backdrop-blur-md space-y-4 max-h-[520px] overflow-y-auto">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  Timetable for {format(new Date(), "EEEE")}
                </h3>

                {todaySchedule.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No classes scheduled for today.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todaySchedule.map((slot: any) => (
                      <div
                        key={slot.id}
                        className="p-3 rounded-2xl border border-border/40 bg-card/20/40/10 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-extrabold text-xs text-foreground">
                            {slot.courseClass?.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Roster: {slot.classSection?.name}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/10 text-primary font-mono">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grading Queue (col-span-1) */}
          <div className="space-y-6 lg:col-span-1">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Grading Queue
              </h3>
              <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl shadow-black/5/50/20 backdrop-blur-md flex flex-col h-[520px]">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border/20/40 pb-3 mb-3">
                  <BookOpen className="h-4. w-4 text-primary" />
                  Submissions to Grade
                </h3>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {ungradedSubmissions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs py-6">
                      No assignments awaiting grades.
                    </div>
                  ) : (
                    ungradedSubmissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-2xl border border-border/40 bg-card/20/40/10 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-foreground truncate">
                              {sub.homework?.title}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              Student: {sub.studentProfile?.fullName}
                            </p>
                          </div>

                          <Link
                            href="/homework"
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary"
                          >
                            Grade <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[9px] font-bold text-muted-foreground">
                          <span>
                            Submitted: {format(new Date(sub.submissionDate), "MMM dd")}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full ${
                            sub.status === "LATE"
                              ? "bg-orange-500/10 text-orange-600"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Alerts (col-span-1) */}
          <div className="space-y-6 lg:col-span-1">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Student Alerts
              </h3>
              <PerformanceAlerts />
            </div>
          </div>
        </div>
      )}

      {activeSection === "messages" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Parent Messaging Center
            </h2>
            <p className="text-xs text-muted-foreground">
              Reply to incoming communications from parents and guardians of your students.
            </p>
          </div>
          <MessagingCenter currentUserId={currentUserId} isGuardian={false} />
        </div>
      )}
    </div>
  );
}
