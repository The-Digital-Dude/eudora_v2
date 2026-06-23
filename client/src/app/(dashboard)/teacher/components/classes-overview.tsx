"use client";

import React from "react";
import { Users, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import type { TeacherClassOverview } from "@/features/teacher/teacherPortalApi";

interface ClassesOverviewProps {
  classes: TeacherClassOverview[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  isLoading: boolean;
}

export function ClassesOverview({
  classes,
  activeClassId,
  onSelectClass,
  isLoading,
}: ClassesOverviewProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
          Loading assigned classes...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((cls) => {
        const isActive = cls.classSectionId === activeClassId;
        return (
          <div
            key={cls.classSectionId}
            className={`p-5 rounded-2xl border transition-all duration-300 ${
              isActive
                ? "bg-indigo-600/10 border-indigo-500 dark:bg-indigo-950/20 dark:border-indigo-500/50"
                : "bg-white/40 border-zinc-200/50 hover:bg-white/60 dark:bg-zinc-950/10 dark:border-zinc-800/50 dark:hover:bg-zinc-900/20"
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-mono">
                  {cls.code}
                </span>
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 mt-2">
                  {cls.name}
                </h4>
              </div>

              {cls.isAttendanceMarkedToday ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                  <CheckCircle2 className="h-3 w-3" />
                  Marked Today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">
                  <AlertCircle className="h-3 w-3" />
                  Needs Roll
                </span>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200/20 dark:border-zinc-800/40 mt-5 pt-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {cls.rosterCount} Roster
              </span>

              <button
                onClick={() => onSelectClass(cls.classSectionId)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
                }`}
              >
                {isActive ? "Viewing Sheet" : "Mark Attendance"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
