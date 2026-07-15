"use client";

import { Loader2 } from "lucide-react";
import React from "react";

import { useGetDashboardSnapshotQuery } from "@/features/dashboard/dashboardApi";
import { useGetBadgesQuery,useGetGamificationMeQuery } from "@/features/student/studentApi";
import { useAppSelector } from "@/store/hooks";

import { AttendanceMini } from "./components/attendance-mini";
import { BadgeGrid } from "./components/badge-grid";
import { LeaderboardCard } from "./components/leaderboard-card";
import { ProgressHero } from "./components/progress-hero";
import { UpcomingList } from "./components/upcoming-list";

export default function StudentPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  // Query student gamification stats
  const { data: gamificationMe, isLoading: isGamificationMeLoading } = useGetGamificationMeQuery();

  // Query badges
  const { data: badges = [], isLoading: isBadgesLoading } = useGetBadgesQuery();

  // Query dashboard snapshot
  const { data: snapshot, isLoading: isSnapshotLoading } = useGetDashboardSnapshotQuery();

  const isLoading = isGamificationMeLoading || isBadgesLoading || isSnapshotLoading;

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading your Student Portal...</p>
      </div>
    );
  }

  const homework = snapshot?.pendingHomework || [];
  const assessments = snapshot?.upcomingAssessments || [];
  const attendanceSummary = snapshot?.attendanceSummary;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Student Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.firstName || user?.name || "Student"}. Here is your learning overview, XP progression, and upcoming tasks.
        </p>
      </div>

      {/* Row 1: Progress Hero (Streaks, XP wheel, Lessons done) */}
      <ProgressHero data={gamificationMe} isLoading={isGamificationMeLoading} />

      {/* Row 2: Roster Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Widget 1: Upcoming Tasks (merged Homework + Assessments) */}
        <UpcomingList homework={homework} assessments={assessments} isLoading={isSnapshotLoading} />

        {/* Widget 2: Attendance Mini Summary */}
        <AttendanceMini summary={attendanceSummary} isLoading={isSnapshotLoading} />

        {/* Widget 3: Class Leaderboard Card */}
        <LeaderboardCard />
      </div>

      {/* Row 3: Badge Grid */}
      <BadgeGrid badges={badges} isLoading={isBadgesLoading} />
    </div>
  );
}
