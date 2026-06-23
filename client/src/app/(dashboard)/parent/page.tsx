"use client";

import React, { useState, useEffect } from "react";
import { useGetChildrenQuery, useGetChildAttendanceQuery, useGetChildHomeworkQuery, useGetChildGradesQuery } from "@/features/parent/parentApi";
import { ChildSelector } from "./components/child-selector";
import { ChildStatusCard } from "./components/child-status-card";
import { AttendanceCalendar } from "./components/attendance-calendar";
import { HomeworkGradesPanel } from "./components/homework-grades-panel";
import { BillingHistoryPanel } from "./components/billing-history-panel";
import { MessagingCenter } from "@/features/messaging/components/MessagingCenter";
import { useAppSelector } from "@/store/hooks";
import { Loader2, GraduationCap, ClipboardList, CreditCard, MessageSquare, ShieldAlert } from "lucide-react";

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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading children data...</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] p-6 text-center rounded-3xl border border-zinc-200/50 bg-white/40 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md">
        <ShieldAlert className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">No linked children</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
          We couldn't find any student profiles linked to your guardian account. Please contact school administration to set up your links.
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
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Parent Portal
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Welcome back, {user?.name || "Guardian"}. Monitor your children's educational progress and schedules.
          </p>
        </div>

        {/* Global Navigation Tabs for Parent */}
        <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 self-start md:self-auto">
          <button
            onClick={() => setActiveSection("academics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "academics"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Academics
          </button>
          <button
            onClick={() => setActiveSection("billing")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "billing"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </button>
          <button
            onClick={() => setActiveSection("messages")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "messages"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
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
            <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Attendance Calendar (col-span-1) */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Attendance Calendar
              </h3>
              {isAttendanceLoading ? (
                <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md flex items-center justify-center h-[280px]">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : (
                <AttendanceCalendar records={attendance} />
              )}
            </div>

            {/* Homework and Grades (col-span-2) */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Assignments & Grades
              </h3>
              <HomeworkGradesPanel
                homework={homework}
                grades={grades}
                isHomeworkLoading={isHomeworkLoading}
                isGradesLoading={isGradesLoading}
              />
            </div>
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
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Message Center
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Send messages directly to the teachers of your children's classes.
            </p>
          </div>
          <MessagingCenter currentUserId={currentUserId} isGuardian={true} />
        </div>
      )}
    </div>
  );
}
