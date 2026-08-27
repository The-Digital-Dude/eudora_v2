"use client";

import { Flame, Loader2, Sparkles, Trophy } from "lucide-react";
import React from "react";

import { useGetChildLearningQuery } from "@/features/parent/parentApi";

interface LearningPanelProps {
  studentProfileId: string;
  childName: string;
}

/** Read-only active-learning summary for guardians — progress, not gameplay. */
export function LearningPanel({ studentProfileId, childName }: LearningPanelProps) {
  const { data, isLoading } = useGetChildLearningQuery(studentProfileId, {
    skip: !studentProfileId,
  });

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Lesson Library
        </h3>
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          View only
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No learning activity recorded for {childName} yet.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Lessons done
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">{data.lessonsCompleted}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <Flame className="h-3 w-3 text-warning" /> Streak
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {data.currentStreak} {data.currentStreak === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <Trophy className="h-3 w-3 text-primary" /> Level
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">{data.level}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Total XP
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">{data.totalXp}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
