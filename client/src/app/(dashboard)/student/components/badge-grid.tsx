"use client";

import React from "react";
import { Award, Lock, Sparkles, Flame, BookOpen, Star, Trophy } from "lucide-react";
import type { VirtualBadge } from "@/features/student/studentApi";

interface BadgeGridProps {
  badges: VirtualBadge[];
  isLoading: boolean;
}

export function BadgeGrid({ badges, isLoading }: BadgeGridProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
          Loading achievements...
        </div>
      </div>
    );
  }

  // Get specific icons for badges based on code
  const getBadgeIcon = (code: string, earned: boolean) => {
    const iconClass = `h-8 w-8 ${earned ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"}`;
    switch (code) {
      case "STREAK_7":
      case "STREAK_30":
        return <Flame className={`${iconClass} ${earned ? "fill-amber-500 text-amber-500" : ""}`} />;
      case "XP_1000":
      case "XP_5000":
        return <Star className={`${iconClass} ${earned ? "fill-indigo-500" : ""}`} />;
      case "LESSONS_10":
      case "LESSONS_50":
        return <BookOpen className={iconClass} />;
      case "PERFECT_SCORE":
        return <Trophy className={`${iconClass} ${earned ? "fill-yellow-500 text-yellow-500" : ""}`} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  const getBadgeGradient = (code: string, earned: boolean) => {
    if (!earned) return "from-zinc-100 to-zinc-50 dark:from-zinc-900/50 dark:to-zinc-950/50 border-zinc-200/50 dark:border-zinc-800/40 opacity-60";
    
    switch (code) {
      case "STREAK_7":
      case "STREAK_30":
        return "from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 dark:border-amber-500/10 shadow-amber-500/5";
      case "XP_1000":
      case "XP_5000":
        return "from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20 dark:border-indigo-500/10 shadow-indigo-500/5";
      case "PERFECT_SCORE":
        return "from-yellow-500/10 via-amber-500/5 to-transparent border-yellow-500/20 dark:border-yellow-500/10 shadow-yellow-500/5";
      default:
        return "from-purple-500/10 via-pink-500/5 to-transparent border-purple-500/20 dark:border-purple-500/10 shadow-purple-500/5";
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-500" />
            Achievements & Badges
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Complete active learning lessons and login streaks to unlock virtual badges.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {badges.filter((b) => b.earned).length} / {badges.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map((badge) => {
          const progressPercent = badge.maxProgress > 0 ? Math.round((badge.progress / badge.maxProgress) * 100) : 0;
          return (
            <div
              key={badge.code}
              className={`p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between min-h-[160px] bg-gradient-to-br ${getBadgeGradient(
                badge.code,
                badge.earned
              )}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2 rounded-xl bg-white dark:bg-zinc-950 shadow-sm border ${badge.earned ? "border-indigo-100 dark:border-zinc-800" : "border-zinc-200 dark:border-zinc-800/50"}`}>
                    {getBadgeIcon(badge.code, badge.earned)}
                  </div>
                  {!badge.earned && (
                    <Lock className="h-3.5 w-3.5 text-zinc-400/80 dark:text-zinc-600 mt-1" />
                  )}
                </div>

                <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-100 mt-3">
                  {badge.name}
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                  {badge.description}
                </p>
              </div>

              {/* Progress Bar for Locked Badges */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mb-1">
                  <span>Progress</span>
                  <span>
                    {badge.progress} / {badge.maxProgress}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.earned ? "bg-indigo-600 dark:bg-indigo-400" : "bg-zinc-400 dark:bg-zinc-600"
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
