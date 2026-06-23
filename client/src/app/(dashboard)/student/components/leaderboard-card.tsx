"use client";

import React, { useState } from "react";
import { Trophy, Medal, Sparkles, TrendingUp, Users } from "lucide-react";
import type { LeaderboardData } from "@/features/student/studentApi";
import { useGetLeaderboardQuery } from "@/features/student/studentApi";

export function LeaderboardCard() {
  const [scope, setScope] = useState<"class" | "year">("class");
  const { data, isLoading } = useGetLeaderboardQuery({ scope });

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
          Loading leaderboard...
        </div>
      </div>
    );
  }

  const { data: rankings = [], me = null } = data;

  // Split into Top 3 podium and rest
  const topThree = rankings.slice(0, 3);
  const remainingRankings = rankings.slice(3);

  // Check if current user is in Top 3
  const isMeInTopThree = topThree.some((row) => row.studentProfileId === me?.studentProfileId);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-white font-extrabold text-[10px] shadow-md shadow-yellow-500/20">
            1st
          </div>
        );
      case 2:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-400 text-white font-extrabold text-[10px] shadow-md shadow-zinc-400/20">
            2nd
          </div>
        );
      case 3:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600/80 text-white font-extrabold text-[10px] shadow-md shadow-amber-600/20">
            3rd
          </div>
        );
      default:
        return (
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 w-6 text-center">
            #{rank}
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-200/50 bg-white/40 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              XP Leaderboard
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Rankings based on active learning experience points.
            </p>
          </div>

          {/* Scope Selectors */}
          <div className="inline-flex rounded-lg bg-zinc-100/85 p-0.5 dark:bg-zinc-900/60">
            <button
              onClick={() => setScope("class")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                scope === "class"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              <Users className="h-3 w-3" />
              Class Section
            </button>
            <button
              onClick={() => setScope("year")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                scope === "year"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              Academic Year
            </button>
          </div>
        </div>
      </div>

      {/* Ranks list section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
            <Trophy className="h-10 w-10 text-zinc-300 dark:text-zinc-800 mb-2" />
            <p className="text-xs font-semibold">No rankings available</p>
          </div>
        ) : (
          <>
            {/* Podium top 3 render */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pb-4 pt-2 border-b border-zinc-200/40 dark:border-zinc-800/20">
                {/* 2nd place (Left) */}
                {topThree[1] && (
                  <div className={`flex flex-col items-center justify-end p-3 rounded-2xl border text-center ${topThree[1].studentProfileId === me?.studentProfileId ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-100 dark:border-zinc-800/40'}`}>
                    <Medal className="h-6 w-6 text-zinc-400 mb-1" />
                    <span className="text-[10px] font-extrabold text-zinc-800 dark:text-zinc-200 truncate max-w-full">
                      {topThree[1].fullName}
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-0.5">Lvl {topThree[1].level}</span>
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 mt-1">{topThree[1].totalXp} XP</span>
                  </div>
                )}
                {/* 1st place (Center) */}
                {topThree[0] && (
                  <div className={`flex flex-col items-center justify-end p-3.5 py-4 rounded-2xl border text-center relative -top-2 shadow-md ${topThree[0].studentProfileId === me?.studentProfileId ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-amber-500/5 dark:bg-amber-500/5 border-yellow-500/20'}`}>
                    <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 right-2 animate-pulse" />
                    <Trophy className="h-8 w-8 text-yellow-500 fill-yellow-500/20 mb-1" />
                    <span className="text-[11px] font-black text-zinc-950 dark:text-zinc-50 truncate max-w-full">
                      {topThree[0].fullName}
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-0.5">Lvl {topThree[0].level}</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1">{topThree[0].totalXp} XP</span>
                  </div>
                )}
                {/* 3rd place (Right) */}
                {topThree[2] && (
                  <div className={`flex flex-col items-center justify-end p-3 rounded-2xl border text-center ${topThree[2].studentProfileId === me?.studentProfileId ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-100 dark:border-zinc-800/40'}`}>
                    <Medal className="h-6 w-6 text-amber-600/80 mb-1" />
                    <span className="text-[10px] font-extrabold text-zinc-800 dark:text-zinc-200 truncate max-w-full">
                      {topThree[2].fullName}
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-0.5">Lvl {topThree[2].level}</span>
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 mt-1">{topThree[2].totalXp} XP</span>
                  </div>
                )}
              </div>
            )}

            {/* List for rest */}
            <div className="space-y-1 pt-2">
              {remainingRankings.map((row) => {
                const isMeRow = row.studentProfileId === me?.studentProfileId;
                return (
                  <div
                    key={row.studentProfileId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isMeRow
                        ? "bg-indigo-500/10 border-indigo-500/30 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getRankBadge(row.rank)}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                          {row.fullName}
                        </p>
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold">
                          Level {row.level}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                      {row.totalXp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating My Rank Bar at bottom if user is not in top podium/list or if remaining scroll is long */}
      {me && !isMeInTopThree && (
        <div className="p-4 border-t border-zinc-200/50 bg-indigo-600 text-white dark:border-zinc-800 dark:bg-indigo-950/80 backdrop-blur-md flex items-center justify-between shadow-2xl relative z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-black text-xs">
              #{me.rank}
            </span>
            <div>
              <p className="text-xs font-extrabold">Your Position (You)</p>
              <p className="text-[10px] text-indigo-200">Level {me.level}</p>
            </div>
          </div>
          <span className="text-sm font-black">{me.totalXp} XP</span>
        </div>
      )}
    </div>
  );
}
