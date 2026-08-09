"use client";

import { CheckCircle2, Circle, Flag } from "lucide-react";
import React from "react";

import { useGetTodaysGoalsQuery } from "@/features/student/studentApi";

export function TodaysGoals() {
  const { data, isLoading } = useGetTodaysGoalsQuery();

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Today&apos;s goals</span>
        <Flag className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-2">
        {data.goals.map((goal) => {
          const complete = goal.progress >= goal.target;
          return (
            <div key={goal.key} className="flex items-center gap-2">
              {complete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={`text-[11px] font-medium ${complete ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {goal.label} · {goal.progress}/{goal.target}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
