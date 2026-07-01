"use client";

import React from "react";
import { Flame, Star, Trophy, Award, BookOpen } from "lucide-react";
import type { GamificationMe } from "@/features/student/studentApi";

interface ProgressHeroProps {
  data: GamificationMe | undefined;
  isLoading: boolean;
}

export function ProgressHero({ data, isLoading }: ProgressHeroProps) {
  if (isLoading || !data) {
    return (
      <div className="h-48 rounded-3xl border border-border/50 bg-card/40/50/20 backdrop-blur-md flex items-center justify-center">
        <div className="text-sm font-medium text-muted-foreground">Loading your progress...</div>
      </div>
    );
  }

  const { experience, streak, lessonsCompleted } = data;
  const { totalXp, level, nextLevelXp } = experience;
  const { currentStreak, longestStreak } = streak;

  // Calculate percentage of level completed
  // Level threshold calculations can be customized, assuming nextLevelXp is the target XP for the next level
  // and we show percentage progress between current level and next level
  // For display, we can assume level * 1000 is base XP, or just calculate fraction of nextLevelXp
  const levelXpFloor = (level - 1) * 1000;
  const xpInCurrentLevel = totalXp - levelXpFloor;
  const xpNeededForNextLevel = nextLevelXp - levelXpFloor;
  const rawPercent = xpNeededForNextLevel > 0 ? (xpInCurrentLevel / xpNeededForNextLevel) * 100 : 0;
  const percent = Math.min(Math.max(Math.round(rawPercent), 0), 100);

  // SVG Circle calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-xl shadow-primary/5 backdrop-blur-md">
      {/* Background ambient glows */}
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
        {/* Level Ring Left */}
        <div className="flex items-center gap-6">
          <div className="relative flex h-28 w-28 items-center justify-center shrink-0">
            {/* Background circle */}
            <svg className="absolute inset-0 h-full w-full -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-zinc-200/50 dark:stroke-zinc-800/50"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-indigo-600 dark:stroke-indigo-400 transition-all duration-1000 ease-out"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-foreground leading-none">
                Lvl {level}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                {percent}%
              </span>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wide">
              <Star className="h-3 w-3 fill-indigo-500" />
              XP Rank Ready
            </span>
            <h2 className="text-xl font-black text-foreground mt-2">
              Keep Up the Great Work!
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              You are at <span className="font-extrabold text-primary">{totalXp} XP</span>. You need{" "}
              <span className="font-bold">{nextLevelXp - totalXp} XP</span> to reach Level {level + 1}.
            </p>
          </div>
        </div>

        {/* Streaks & Lessons Right */}
        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-end w-full md:w-auto">
          {/* Active Streak */}
          <div className="flex items-center gap-3 p-4 px-5 rounded-2xl border border-border/50 bg-card/30/40/20 backdrop-blur-sm shadow-sm min-w-[130px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning animate-pulse">
              <Flame className="h-6 w-6 fill-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {currentStreak}
              </div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Day Streak
              </div>
            </div>
          </div>

          {/* Lessons completed */}
          <div className="flex items-center gap-3 p-4 px-5 rounded-2xl border border-border/50 bg-card/30/40/20 backdrop-blur-sm shadow-sm min-w-[130px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {lessonsCompleted}
              </div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Lessons Done
              </div>
            </div>
          </div>

          {/* Max Streak */}
          <div className="flex items-center gap-3 p-4 px-5 rounded-2xl border border-border/50 bg-card/30/40/20 backdrop-blur-sm shadow-sm min-w-[130px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {longestStreak}
              </div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Record Streak
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
