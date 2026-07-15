"use client";

import { AlertCircle,CheckCircle2, Users } from "lucide-react";
import React from "react";

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
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl/50/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
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
                ? "bg-primary/10 border-primary"
                : "bg-card/40 border-border/50 hover:bg-card/60/10/50/20"
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground uppercase tracking-wider font-mono">
                  {cls.code}
                </span>
                <h4 className="font-extrabold text-sm text-foreground mt-2">
                  {cls.name}
                </h4>
              </div>

              {cls.isAttendanceMarkedToday ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success uppercase">
                  <CheckCircle2 className="h-3 w-3" />
                  Marked Today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning uppercase">
                  <AlertCircle className="h-3 w-3" />
                  Needs Roll
                </span>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/20/40 mt-5 pt-3">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {cls.rosterCount} Roster
              </span>

              <button
                onClick={() => onSelectClass(cls.classSectionId)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "bg-muted hover:bg-muted text-foreground"
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
