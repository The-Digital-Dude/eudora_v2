"use client";

import { BookOpen, CreditCard, GraduationCap, Loader2 } from "lucide-react";
import React, { useState } from "react";

import {
  useGetChildAttendanceQuery,
  useGetChildGradesQuery,
  useGetChildHomeworkQuery,
} from "@/features/parent/parentApi";
import { useActingChild } from "@/features/parent/useActingChild";
import { useAppSelector } from "@/store/hooks";

import { AttendanceCalendar } from "./components/attendance-calendar";
import { BillingHistoryPanel } from "./components/billing-history-panel";
import { ChildSummary } from "./components/child-summary";
import { ChildTabs } from "./components/child-tabs";
import { ClassEnrollmentPanel } from "./components/class-enrollment-panel";
import { CoursePlanPanel } from "./components/course-plan-panel";
import { HomeworkGradesPanel } from "./components/homework-grades-panel";
import { LearningPanel } from "./components/learning-panel";
import { ParentWelcome } from "./components/parent-welcome";
import { PurchasesPanel } from "./components/purchases-panel";

type Section = "academics" | "courses" | "billing";

const SECTIONS: {
  id: Section;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "academics", label: "Progress", Icon: GraduationCap },
  { id: "courses", label: "Courses", Icon: BookOpen },
  { id: "billing", label: "Billing", Icon: CreditCard },
];

/**
 * The family portal.
 *
 * Reads top to bottom as the question a guardian actually arrives with: which
 * child, how are they doing, what do I want to do about it. So the child picker
 * sits above everything it governs, the selected child's numbers are shown once
 * rather than repeated on a card per child, and the section tabs come last
 * because all they do is re-point the detail below them.
 */
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
  const [activeSection, setActiveSection] = useState<Section>("academics");

  const { data: attendance = [], isLoading: isAttendanceLoading } = useGetChildAttendanceQuery(
    activeStudentId,
    { skip: !activeStudentId },
  );

  const { data: homework = [], isLoading: isHomeworkLoading } = useGetChildHomeworkQuery(
    activeStudentId,
    { skip: !activeStudentId },
  );

  const { data: grades = [], isLoading: isGradesLoading } = useGetChildGradesQuery(activeStudentId, {
    skip: !activeStudentId,
  });

  if (isChildrenLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading your family portal...</p>
      </div>
    );
  }

  // The whole page, not a card in the corner of one. A guardian with no child
  // yet has exactly one useful thing to do here, so the page should be it.
  if (children.length === 0) {
    return <ParentWelcome firstName={user?.firstName} />;
  }

  const selectedChild = children.find((c) => c.studentProfileId === activeStudentId) || children[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-foreground text-xl font-bold tracking-tight">
          Family portal
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Welcome back, {user?.firstName || "Guardian"}.
        </p>
      </div>

      <ChildTabs
        childList={children}
        activeChildId={selectedChild.studentProfileId}
        onSelect={setActiveStudentId}
      />

      <ChildSummary child={selectedChild} />

      {/* Underlined rather than a pill group: these are page sections, and an
          underline is the convention that says "what is below changes", where a
          pill group reads as a filter narrowing what is already on screen. */}
      <div className="border-border flex gap-1 border-b">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            aria-current={activeSection === id ? "page" : undefined}
            className={`-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeSection === id
                ? "border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeSection === "academics" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col lg:col-span-1">
            <SectionHeading>Attendance</SectionHeading>
            {isAttendanceLoading ? (
              <div className="border-border bg-card flex min-h-[280px] flex-1 items-center justify-center rounded-3xl border p-6">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : (
              <AttendanceCalendar records={attendance} />
            )}
          </div>

          <div className="flex flex-col lg:col-span-2">
            <SectionHeading>Assignments &amp; grades</SectionHeading>
            <HomeworkGradesPanel
              homework={homework}
              grades={grades}
              isHomeworkLoading={isHomeworkLoading}
              isGradesLoading={isGradesLoading}
            />
          </div>

          <div className="lg:col-span-3">
            <LearningPanel
              studentProfileId={selectedChild.studentProfileId}
              childName={selectedChild.fullName}
            />
          </div>
        </div>
      )}

      {activeSection === "courses" && (
        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-foreground text-base font-bold tracking-tight">Learning plan</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Self-paced courses {selectedChild.fullName} works through in their own time.
              </p>
            </div>
            <CoursePlanPanel
              studentProfileId={selectedChild.studentProfileId}
              childName={selectedChild.fullName}
            />
          </section>

          <section className="border-border space-y-4 border-t pt-8">
            <div>
              <h2 className="text-foreground text-base font-bold tracking-tight">Class enrolment</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Scheduled classes with a teacher and a set term — separate from the self-paced plan
                above.
              </p>
            </div>
            <ClassEnrollmentPanel
              studentProfileId={selectedChild.studentProfileId}
              childName={selectedChild.fullName}
            />
          </section>
        </div>
      )}

      {activeSection === "billing" && (
        <div className="space-y-8">
          {/* Purchases first — that is what a guardian actually bought. The
              invoice ledger below is staff-entered offline billing, a separate
              system that predates checkout. */}
          <PurchasesPanel />
          <div className="border-border border-t pt-8">
            <BillingHistoryPanel />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground mb-3 text-[10px] font-bold tracking-wider uppercase">
      {children}
    </h3>
  );
}
