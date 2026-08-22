"use client";

import {
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
  GraduationCap,
  Layers,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useGetBatchesQuery,
  useGetDashboardSnapshotQuery,
  useGetProgramsQuery,
  useGetStudentProfilesQuery,
  useGetTeacherProfilesQuery,
} from "@/features/dashboard/dashboardApi";
import { useGetTeacherApplicationsQuery } from "@/features/teacher/teacherApplicationsApi";

import { AttentionQueue } from "./components/attention-queue";

/**
 * The operator's overview.
 *
 * Every number here comes from an endpoint. It previously led with three
 * charts and three headline figures that were invented — a seeded-random
 * 91-day series, a hardcoded attendance donut, and cards reading "1,842
 * students", "$178,560 revenue", "+12%". On a dashboard whose whole purpose is
 * telling one person how the business is doing, a plausible fabricated number
 * is worse than no number: it is indistinguishable from a real one.
 *
 * So the page is built from what the API actually answers, and ordered by what
 * a single operator opens it to find out: what needs me today, what is
 * happening today, how big is this thing.
 */
export default function DashboardOverview() {
  // Today, as a plain date. The snapshot endpoint buckets by calendar day.
  const today = React.useMemo(() => new Date(), []);
  const isoDate = React.useMemo(() => today.toISOString().split("T")[0], [today]);

  const { data: snapshot, isLoading: isLoadingSnapshot } = useGetDashboardSnapshotQuery({
    date: isoDate,
  });

  // limit: 1 makes each of these effectively a count query — the totals are
  // server-computed and independent of paging.
  const { data: students } = useGetStudentProfilesQuery({ limit: 1 });
  const { data: teachers } = useGetTeacherProfilesQuery({ limit: 1 });
  const { data: programs } = useGetProgramsQuery({ limit: 1 });
  const { data: batches } = useGetBatchesQuery({ limit: 1 });
  const { data: applications } = useGetTeacherApplicationsQuery({ limit: 1, status: "PENDING" });

  const unmarked = snapshot?.attendanceSnapshot?.unmarkedCount ?? 0;
  const marked = snapshot?.attendanceSnapshot?.markedCount ?? 0;
  const absent = snapshot?.attendanceSnapshot?.absentCount ?? 0;
  const rosterToday = snapshot?.attendanceSnapshot?.totalStudents ?? 0;
  const dueToday = snapshot?.homeworkSnapshot?.dueToday ?? 0;
  const ungraded = snapshot?.homeworkSnapshot?.ungradedSubmissions ?? 0;
  const draftGrades = snapshot?.gradebookSnapshot?.draftEntries ?? 0;
  const activeSlots = snapshot?.timetableOccupancy?.activeSlotsCount ?? 0;
  const pendingApplications = applications?.total ?? 0;

  const markedPercent = rosterToday > 0 ? Math.round((marked / rosterToday) * 100) : 0;

  if (isLoadingSnapshot) {
    return (
      <div className="animate-pulse space-y-6 py-6">
        <div className="bg-muted h-8 w-1/3 rounded-lg" />
        <div className="bg-muted/60 h-24 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-foreground text-xl font-bold tracking-tight">
            Operations
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {today.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          asChild
          className="bg-foreground text-background hover:bg-foreground/90 flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-98"
        >
          <Link href="/programs/create">
            <Plus className="h-4 w-4" /> Add program
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <SectionHeading>Needs your attention</SectionHeading>
        <AttentionQueue
          items={[
            {
              count: unmarked,
              label: (n) => `${n} student${n === 1 ? "" : "s"} not marked today`,
              href: "/attendance",
            },
            {
              count: ungraded,
              label: (n) => `${n} submission${n === 1 ? "" : "s"} waiting to be graded`,
              href: "/homework",
            },
            {
              count: draftGrades,
              label: (n) => `${n} grade${n === 1 ? "" : "s"} still in draft`,
              href: "/gradebook",
            },
            {
              count: pendingApplications,
              label: (n) => `${n} teaching application${n === 1 ? "" : "s"} to review`,
              href: "/teachers",
              severity: "info",
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <SectionHeading>Today</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Attendance marked"
            value={rosterToday > 0 ? `${marked} / ${rosterToday}` : "—"}
            footer={
              rosterToday > 0 ? (
                <span className="w-full">
                  {/* Meter rather than a bare percentage: the gap left to close
                      is the part an operator acts on. */}
                  <span className="bg-muted mb-1 block h-1 w-full overflow-hidden rounded-full">
                    <span
                      className={`block h-full rounded-full ${
                        markedPercent === 100 ? "bg-success" : "bg-warning"
                      }`}
                      style={{ width: `${markedPercent}%` }}
                    />
                  </span>
                  <span>
                    {markedPercent}% marked
                    {absent > 0 ? ` · ${absent} absent` : ""}
                  </span>
                </span>
              ) : (
                <span>No students placed in a class yet</span>
              )
            }
          />
          <StatTile
            label="Homework due"
            value={dueToday}
            footer={<span>{ungraded} submitted and ungraded</span>}
          />
          <StatTile
            label="Scheduled slots"
            value={activeSlots}
            footer={<span>Timetabled for today</span>}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading>Platform</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Students" value={students?.total ?? 0} />
          <StatTile label="Teachers" value={teachers?.total ?? 0} />
          <StatTile label="Programs" value={programs?.total ?? 0} />
          <StatTile label="Batches" value={batches?.total ?? 0} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading>Manage</SectionHeading>
        {/* Only destinations that exist. Two of these used to be cards with no
            href at all — "Academic Reviews" and "Snapshots" — which looked
            clickable and did nothing. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ManageLink href="/students" Icon={Users} label="Students" hint="Roster & placements" />
          <ManageLink href="/teachers" Icon={GraduationCap} label="Teachers" hint="Staff & applications" />
          <ManageLink href="/programs" Icon={Layers} label="Programs" hint="What you sell" />
          {/* Was /timetable, which has no page and 404'd. Weekly schedules now
              live per cohort, behind the calendar icon on a batch row. */}
          <ManageLink href="/batches" Icon={Calendar} label="Batches" hint="Cohorts & schedules" />
          <ManageLink href="/attendance" Icon={UserCheck} label="Attendance" hint="Daily marking" />
          <ManageLink href="/gradebook" Icon={Award} label="Gradebook" hint="Marks & transcripts" />
          <ManageLink href="/homework" Icon={CheckSquare} label="Homework" hint="Tasks & submissions" />
          <ManageLink href="/courses" Icon={BookOpen} label="Courses" hint="Lessons & content" />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
      {children}
    </h2>
  );
}

function ManageLink({
  href,
  Icon,
  label,
  hint,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <Link href={href}>
      <Card className="border-border hover:border-foreground/20 flex h-full flex-col gap-2 rounded-2xl border p-4 transition-all select-none hover:shadow-md">
        <span className="bg-muted text-foreground w-fit rounded-xl p-2">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-foreground text-xs font-bold">{label}</span>
        <span className="text-muted-foreground text-[10px] leading-snug">{hint}</span>
      </Card>
    </Link>
  );
}
