"use client";

import { BookOpen, CreditCard, GraduationCap, Loader2 } from "lucide-react";
import React, {useState } from "react";

import { AddChildDialog } from "@/components/add-child-dialog";
import { AddChildForm } from "@/components/add-child-form";
import { useGetChildAttendanceQuery, useGetChildGradesQuery,useGetChildHomeworkQuery } from "@/features/parent/parentApi";
import { useActingChild } from "@/features/parent/useActingChild";
import { useAppSelector } from "@/store/hooks";

import { AttendanceCalendar } from "./components/attendance-calendar";
import { BillingHistoryPanel } from "./components/billing-history-panel";
import { ChildStatusCard } from "./components/child-status-card";
import { ClassEnrollmentPanel } from "./components/class-enrollment-panel";
import { CoursePlanPanel } from "./components/course-plan-panel";
import { HomeworkGradesPanel } from "./components/homework-grades-panel";
import { LearningPanel } from "./components/learning-panel";
import { PurchasesPanel } from "./components/purchases-panel";

export default function ParentPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  // Shared with the topbar switcher and, crucially, with the
  // `x-acting-student-id` header. This used to be local state that never
  // reached localStorage, so the page could show one child while every API
  // call was still scoped to another.
  const {
    children,
    isLoading: isChildrenLoading,
    activeChildId,
    select: setActiveStudentId,
  } = useActingChild();
  // "" rather than null so the existing `skip: !activeStudentId` guards keep
  // working unchanged.
  const activeStudentId = activeChildId ?? "";
  const [activeSection, setActiveSection] = useState<"academics" | "courses" | "billing">("academics");

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
    // Previously this told guardians to "contact school administration" — advice
    // that was both a dead end and untrue: adding a child is self-service, the
    // endpoint has always existed, and the form was only reachable from checkout.
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-border/50 bg-card/40 p-6 text-center backdrop-blur-md">
        <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-foreground">
            Add your first child
          </h3>
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            Tell us who you&apos;re learning for, and we&apos;ll set up their
            progress tracking and course plan.
          </p>
        </div>
        <div className="text-left">
          <AddChildForm />
        </div>
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
            onClick={() => setActiveSection("courses")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === "courses"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Courses
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
        </div>
      </div>

      {activeSection === "academics" && (
        <div className="space-y-6">
          {/* Children Status Cards Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Linked Children
              </h3>
              {/* Reachable with children already present — the inline form
                  below only ever shows when there are none. */}
              <AddChildDialog />
            </div>
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

      {activeSection === "courses" && selectedChild && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Learning plan</h2>
            <p className="text-xs text-muted-foreground">
              Choose which self-paced courses {selectedChild.fullName} should work
              on. Use the child picker in the top bar to switch.
            </p>
          </div>
          <CoursePlanPanel
            studentProfileId={selectedChild.studentProfileId}
            childName={selectedChild.fullName}
          />

          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-bold text-foreground">Class enrollment</h2>
            <p className="text-xs text-muted-foreground">
              Term-based classes staff has opened for self-enrollment — separate from the
              self-paced plan above.
            </p>
          </div>
          <ClassEnrollmentPanel
            studentProfileId={selectedChild.studentProfileId}
            childName={selectedChild.fullName}
          />
        </div>
      )}

      {activeSection === "billing" && (
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Stripe purchases first — that is what a guardian actually bought.
              The invoice ledger below is staff-entered offline billing, a
              separate system that predates checkout. */}
          <PurchasesPanel />
          <div className="border-t border-border pt-8">
            <BillingHistoryPanel />
          </div>
        </div>
      )}
    </div>
  );
}
