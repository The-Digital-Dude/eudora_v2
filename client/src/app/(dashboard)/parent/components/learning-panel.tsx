"use client";

import { Flame, Loader2, Sparkles, Trophy } from "lucide-react";
import React from "react";

import { useGetChildLearningQuery } from "@/features/parent/parentApi";

const MASTERY_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  INTRODUCED: "Introduced",
  DEVELOPING: "Developing",
  NEAR_MASTERY: "Near mastery",
  MASTERED: "Mastered",
};

const MASTERY_BAR: Record<string, string> = {
  NOT_STARTED: "bg-border",
  INTRODUCED: "bg-muted-foreground/40",
  DEVELOPING: "bg-primary/60",
  NEAR_MASTERY: "bg-primary",
  MASTERED: "bg-success",
};

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
          Active Learning
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

          {data.mastery.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Concept mastery
              </p>
              {data.mastery.map((m) => (
                <div key={m.competencyName}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{m.competencyName}</span>
                    <span className="font-medium text-muted-foreground">
                      {MASTERY_LABELS[m.status] ?? m.status}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/60">
                    <div
                      className={`h-1.5 rounded-full ${MASTERY_BAR[m.status] ?? "bg-primary/60"}`}
                      style={{ width: `${Math.round(Math.min(1, Math.max(0, m.masteryScore)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
