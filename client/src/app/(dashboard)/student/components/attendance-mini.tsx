"use client";

import React from "react";
import { UserCheck, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

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
      <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
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
    <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md flex flex-col h-[350px]">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
        <UserCheck className="h-4. w-4 text-indigo-500" />
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
                  ? "text-emerald-600 dark:text-emerald-400"
                  : rate >= 85
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}>
                {rate}%
              </span>
            </div>
          </div>

          {/* Rate status label */}
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {rate >= 90 ? "Excellent standing" : rate >= 85 ? "Average attendance" : "Below target"}
            </h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              Class session attendance is critical for keeping up with streaks and XP.
            </p>
          </div>
        </div>

        {/* Attendance Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-6">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900/10 dark:border-zinc-800/40">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider leading-none">
                Present
              </div>
              <div className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">
                {breakdown.PRESENT} days
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900/10 dark:border-zinc-800/40">
            <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider leading-none">
                Late
              </div>
              <div className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">
                {breakdown.LATE} days
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900/10 dark:border-zinc-800/40">
            <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider leading-none">
                Absent
              </div>
              <div className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">
                {breakdown.ABSENT} days
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900/10 dark:border-zinc-800/40">
            <div className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider leading-none">
                Excused
              </div>
              <div className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">
                {breakdown.EXCUSED} days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
