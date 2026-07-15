"use client";

import { Award, BookOpen, Flame, Lock, Sparkles, Star, Trophy } from "lucide-react";
import React from "react";

import type { VirtualBadge } from "@/features/student/studentApi";

interface BadgeGridProps {
  badges: VirtualBadge[];
  isLoading: boolean;
}

export function BadgeGrid({ badges, isLoading }: BadgeGridProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl/50/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Loading achievements...
        </div>
      </div>
    );
  }

  // Get specific icons for badges based on code
  const getBadgeIcon = (code: string, earned: boolean) => {
    const iconClass = `h-8 w-8 ${earned ? "text-primary" : "text-muted-foreground"}`;
    switch (code) {
      case "STREAK_7":
      case "STREAK_30":
        return <Flame className={`${iconClass} ${earned ? "fill-amber-500 text-warning" : ""}`} />;
      case "XP_1000":
      case "XP_5000":
        return <Star className={`${iconClass} ${earned ? "fill-indigo-500" : ""}`} />;
      case "LESSONS_10":
      case "LESSONS_50":
        return <BookOpen className={iconClass} />;
      case "PERFECT_SCORE":
        return <Trophy className={`${iconClass} ${earned ? "fill-yellow-500 text-warning" : ""}`} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  const getBadgeGradient = (code: string, earned: boolean) => {
    if (!earned) return "from-zinc-100 to-zinc-50 dark:from-zinc-900/50 dark:to-zinc-950/50 border-border/50/40 opacity-60";
    
    switch (code) {
      case "STREAK_7":
      case "STREAK_30":
        return "from-amber-500/10 via-orange-500/5 to-transparent border-warning/20 dark:border-warning/10 shadow-warning/5";
      case "XP_1000":
      case "XP_5000":
        return "from-indigo-500/10 via-indigo-500/5 to-transparent border-primary/20/10 shadow-primary/5";
      case "PERFECT_SCORE":
        return "from-yellow-500/10 via-amber-500/5 to-transparent border-yellow-500/20 dark:border-yellow-500/10 shadow-yellow-500/5";
      default:
        return "from-purple-500/10 via-pink-500/5 to-transparent border-primary/20/10 shadow-primary/5";
    }
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl shadow-black/5/50/20 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Achievements & Badges
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Complete active learning lessons and login streaks to unlock virtual badges.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-extrabold flex items-center gap-1">
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
                  <div className={`p-2 rounded-xl bg-background shadow-sm border ${badge.earned ? "border-primary/20" : "border-border/50"}`}>
                    {getBadgeIcon(badge.code, badge.earned)}
                  </div>
                  {!badge.earned && (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/80 mt-1" />
                  )}
                </div>

                <h4 className="font-bold text-xs text-foreground mt-3">
                  {badge.name}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  {badge.description}
                </p>
              </div>

              {/* Progress Bar for Locked Badges */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>
                    {badge.progress} / {badge.maxProgress}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted/60/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.earned ? "bg-primary" : "bg-muted-foreground"
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
