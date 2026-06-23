"use client";

import React from "react";
import { User, Calendar, BookOpen, GraduationCap, AlertCircle } from "lucide-react";
import type { ChildRollup } from "@/features/parent/parentApi";

interface ChildStatusCardProps {
  child: ChildRollup;
  isActive: boolean;
  onSelect: () => void;
}

export function ChildStatusCard({ child, isActive, onSelect }: ChildStatusCardProps) {
  const initials = child.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-3xl border p-6 transition-all duration-300 backdrop-blur-md flex flex-col gap-4 relative overflow-hidden group cursor-pointer ${
        isActive
          ? "bg-white/70 border-indigo-500/40 shadow-xl shadow-indigo-500/5 dark:bg-zinc-900/60 dark:border-indigo-500/30"
          : "bg-white/40 border-zinc-200/50 hover:bg-white/60 dark:bg-zinc-950/20 dark:border-zinc-800/50 dark:hover:bg-zinc-900/20"
      }`}
    >
      {/* Decorative gradient when active */}
      {isActive && (
        <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/10 blur-2xl rounded-full" />
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold text-base">
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {child.fullName}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1 mt-0.5 font-medium">
            <GraduationCap className="h-3.5 w-3.5" />
            {child.classSection ? `${child.classSection.name} (${child.classSection.code})` : "No Active Class"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4 mt-2">
        {/* Attendance widget */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase">Attendance</span>
          <span className={`text-sm font-extrabold ${child.attendanceRate >= 90 ? "text-emerald-500" : child.attendanceRate >= 85 ? "text-amber-500" : "text-rose-500"}`}>
            {child.attendanceRate}%
          </span>
        </div>

        {/* Homework widget */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase">Homework</span>
          <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
            {child.pendingHomeworkCount > 0 ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                {child.pendingHomeworkCount} pending
              </>
            ) : (
              "None"
            )}
          </span>
        </div>

        {/* Latest Grade widget */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase">Latest Mark</span>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
            {child.latestGrade ? `${child.latestGrade.percentage}%` : "No Grades"}
          </span>
        </div>
      </div>
    </button>
  );
}
