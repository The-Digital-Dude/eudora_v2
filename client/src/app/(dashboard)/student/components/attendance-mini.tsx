"use client";

import {UserCheck } from "lucide-react";
import React from "react";

interface AttendanceSummary {
  attendanceRate: number;
  total: number;
  breakdown: {
    PRESENT: number;
    ABSENT: number;
    LATE: number;
    EXCUSED: number;
  };
}

interface AttendanceMiniProps {
  summary: AttendanceSummary | undefined;
  isLoading: boolean;
}

export function AttendanceMini({ summary, isLoading }: AttendanceMiniProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl/50/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Loading attendance summary...
        </div>
      </div>
    );
  }

  const rate = summary?.attendanceRate ?? 100;
  const breakdown = summary?.breakdown ?? { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };

  // SVG Circle configuration
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl shadow-black/5/50/20 backdrop-blur-md flex flex-col h-[350px]">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
        <UserCheck className="h-4. w-4 text-primary" />
        Attendance Rate
      </h3>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center gap-6 w-full px-2">
          {/* Circular Chart */}
          <div className="relative flex h-24 w-24 items-center justify-center shrink-0">
            <svg className="absolute inset-0 h-full w-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-zinc-100 dark:stroke-zinc-900"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`transition-all duration-1000 ease-out ${
                  rate >= 90
                    ? "stroke-emerald-500"
                    : rate >= 85
                    ? "stroke-amber-500"
                    : "stroke-rose-500"
                }`}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center">
              <span className={`text-lg font-black ${
                rate >= 90
                  ? "text-success"
                  : rate >= 85
                  ? "text-warning"
                  : "text-destructive"
              }`}>
                {rate}%
              </span>
            </div>
          </div>

          {/* Rate status label */}
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground">
              {rate >= 90 ? "Excellent standing" : rate >= 85 ? "Average attendance" : "Below target"}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              Class session attendance is critical for keeping up with streaks and XP.
            </p>
          </div>
        </div>

        {/* Attendance Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-6">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border/10/40">
            <div className="h-2 w-2 rounded-full bg-success shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Present
              </div>
              <div className="text-xs font-extrabold text-foreground mt-1">
                {breakdown.PRESENT} days
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border/10/40">
            <div className="h-2 w-2 rounded-full bg-warning shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Late
              </div>
              <div className="text-xs font-extrabold text-foreground mt-1">
                {breakdown.LATE} days
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border/10/40">
            <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Absent
              </div>
              <div className="text-xs font-extrabold text-foreground mt-1">
                {breakdown.ABSENT} days
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border/10/40">
            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Excused
              </div>
              <div className="text-xs font-extrabold text-foreground mt-1">
                {breakdown.EXCUSED} days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
