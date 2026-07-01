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
          ? "bg-card/70 border-primary/40 shadow-xl shadow-primary/5/60/30"
          : "bg-card/40 border-border/50 hover:bg-card/60/20/50/20"
      }`}
    >
      {/* Decorative gradient when active */}
      {isActive && (
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/10 blur-2xl rounded-full" />
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-base">
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate text-base group-hover:text-primary dark:group-hover:text-primary transition-colors">
            {child.fullName}
          </h3>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5 font-medium">
            <GraduationCap className="h-3.5 w-3.5" />
            {child.classSection ? `${child.classSection.name} (${child.classSection.code})` : "No Active Class"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border/50/40 pt-4 mt-2">
        {/* Attendance widget */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">Attendance</span>
          <span className={`text-sm font-extrabold ${child.attendanceRate >= 90 ? "text-success" : child.attendanceRate >= 85 ? "text-warning" : "text-destructive"}`}>
            {child.attendanceRate}%
          </span>
        </div>

        {/* Homework widget */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">Homework</span>
          <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
            {child.pendingHomeworkCount > 0 ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                {child.pendingHomeworkCount} pending
              </>
            ) : (
              "None"
            )}
          </span>
        </div>

        {/* Latest Grade widget */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">Latest Mark</span>
          <span className="text-xs font-bold text-foreground truncate">
            {child.latestGrade ? `${child.latestGrade.percentage}%` : "No Grades"}
          </span>
        </div>
      </div>
    </button>
  );
}
