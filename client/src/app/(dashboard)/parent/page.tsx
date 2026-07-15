"use client";

import { CreditCard, GraduationCap, Loader2, MessageSquare, ShieldAlert } from "lucide-react";
import React, { useEffect,useState } from "react";

import { MessagingCenter } from "@/features/messaging/components/MessagingCenter";
import { useGetChildAttendanceQuery, useGetChildGradesQuery,useGetChildHomeworkQuery, useGetChildrenQuery } from "@/features/parent/parentApi";
import { useAppSelector } from "@/store/hooks";

import { AttendanceCalendar } from "./components/attendance-calendar";
import { BillingHistoryPanel } from "./components/billing-history-panel";
import { ChildStatusCard } from "./components/child-status-card";
import { HomeworkGradesPanel } from "./components/homework-grades-panel";
import { LearningPanel } from "./components/learning-panel";

export default function ParentPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const currentUserId = user?.id;

  const { data: children = [], isLoading: isChildrenLoading } = useGetChildrenQuery();
  const [activeStudentId, setActiveStudentId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<"academics" | "billing" | "messages">("academics");

  // Automatically select the first child
  useEffect(() => {
    if (children.length > 0 && !activeStudentId) {
      setActiveStudentId(children[0].studentProfileId);
    }
  }, [children, activeStudentId]);

  // Fetch data for the active student
  const { data: attendance = [], isLoading: isAttendanceLoading } = useGetChildAttendanceQuery(activeStudentId, {
    skip: !activeStudentId,
  });

  const { data: homework = [], isLoading: isHomeworkLoading } = useGetChildHomeworkQuery(activeStudentId, {
    skip: !activeStudentId,
  });

  const { data: grades = [], isLoading: isGradesLoading } = useGetChildGradesQuery(activeStudentId, {
    skip: !activeStudentId,
  });

  if (isChildrenLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading children data...</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] p-6 text-center rounded-3xl border border-border/50 bg-card/40/50/20 backdrop-blur-md">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-base font-bold text-foreground">No linked children</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          We couldn&apos;t find any student profiles linked to your guardian account. Please contact school administration to set up your links.
        </p>
      </div>
    );
  }

  const selectedChild = children.find((c) => c.studentProfileId === activeStudentId) || children[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Parent Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.firstName || user?.name || "Guardian"}. Monitor your children&apos;s educational progress and schedules.
          </p>
        </div>

        {/* Global Navigation Tabs for Parent */}
        <div className="inline-flex rounded-xl bg-muted p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveSection("academics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "academics"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Academics
          </button>
          <button
            onClick={() => setActiveSection("billing")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "billing"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Billing
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
            Messages
          </button>
        </div>
      </div>

      {activeSection === "academics" && (
        <div className="space-y-6">
          {/* Children Status Cards Grid */}
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Linked Children
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <ChildStatusCard
                  key={child.studentProfileId}
                  child={child}
                  isActive={child.studentProfileId === activeStudentId}
                  onSelect={() => setActiveStudentId(child.studentProfileId)}
                />
              ))}
            </div>
          </div>

          {/* Academic details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attendance Calendar (col-span-1) */}
            <div className="lg:col-span-1 flex flex-col">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Attendance Calendar
              </h3>
              {isAttendanceLoading ? (
                <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl backdrop-blur-md flex items-center justify-center flex-1 min-h-[280px]">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <AttendanceCalendar records={attendance} />
              )}
            </div>

            {/* Homework and Grades (col-span-2) */}
            <div className="lg:col-span-2 flex flex-col">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Assignments & Grades
              </h3>
              <HomeworkGradesPanel
                homework={homework}
                grades={grades}
                isHomeworkLoading={isHomeworkLoading}
                isGradesLoading={isGradesLoading}
              />
            </div>

            {/* Active Learning progress (col-span-3) */}
            {selectedChild && (
              <div className="lg:col-span-3">
                <LearningPanel
                  studentProfileId={selectedChild.studentProfileId}
                  childName={selectedChild.fullName}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === "billing" && (
        <div className="max-w-4xl mx-auto">
          <BillingHistoryPanel />
        </div>
      )}

      {activeSection === "messages" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Message Center
            </h2>
            <p className="text-xs text-muted-foreground">
              Send messages directly to the teachers of your children&apos;s classes.
            </p>
          </div>
          <MessagingCenter currentUserId={currentUserId} isGuardian={true} />
        </div>
      )}
    </div>
  );
}
