"use client";

import { AlertTriangle, CheckCircle2, GraduationCap } from "lucide-react";
import React from "react";

import type { ChildRollup } from "@/features/parent/parentApi";

import { initialsOf } from "./child-tabs";

/**
 * How the selected child is doing, in one line of tiles.
 *
 * Shown once for the child in focus rather than repeated on a card per child.
 * Each tile is label + value; the supporting line underneath says what the
 * number means, because "96%" and "2" tell a parent nothing about whether they
 * need to do something today.
 */
export function ChildSummary({ child }: { child: ChildRollup }) {
  const attendance = attendanceStanding(child.attendanceRate);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-muted text-foreground flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold">
          {initialsOf(child.fullName)}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-foreground truncate text-lg font-bold tracking-tight">
            {child.fullName}
          </h2>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
            <GraduationCap className="h-3.5 w-3.5" />
            {child.classSection
              ? `${child.classSection.name} · ${child.classSection.code}`
              : "Not in a class yet"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Attendance"
          value={`${child.attendanceRate}%`}
          // Status never rides on colour alone — the icon and the word carry it
          // for anyone who cannot separate the hues.
          footer={
            <span className={`inline-flex items-center gap-1 ${attendance.tone}`}>
              <attendance.Icon className="h-3 w-3" />
              {attendance.label}
            </span>
          }
        />
        <StatTile
          label="Homework due"
          value={child.pendingHomeworkCount === 0 ? "None" : String(child.pendingHomeworkCount)}
          footer={
            child.pendingHomeworkCount === 0 ? (
              <span className="text-success inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                All caught up
              </span>
            ) : (
              <span className="text-warning inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Not yet submitted
              </span>
            )
          }
        />
        <StatTile
          label="Latest mark"
          value={child.latestGrade ? `${child.latestGrade.percentage}%` : "—"}
          footer={
            child.latestGrade ? (
              <span className="truncate">{child.latestGrade.title}</span>
            ) : (
              <span>Nothing graded yet</span>
            )
          }
        />
      </div>
    </div>
  );
}

/**
 * Label, value, then one line of meaning. The value uses the font's default
 * proportional figures — tabular figures give every digit the width of a zero,
 * which reads loose at this size and is only worth it in a column of numbers
 * that must align.
 */
function StatTile({
  label,
  value,
  footer,
}: {
  label: string;
  value: string;
  footer: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1.5 text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground mt-1 flex items-center text-[11px]">{footer}</p>
    </div>
  );
}

function attendanceStanding(rate: number) {
  if (rate >= 90) {
    return { label: "Good standing", tone: "text-success", Icon: CheckCircle2 };
  }
  if (rate >= 85) {
    return { label: "Slipping", tone: "text-warning", Icon: AlertTriangle };
  }
  return { label: "Needs attention", tone: "text-destructive", Icon: AlertTriangle };
}
