"use client";

import React from "react";
import { AlertTriangle, ShieldAlert, TrendingDown, UserCheck, Sparkles } from "lucide-react";
import { useGetTeacherAlertsQuery } from "@/features/teacher/teacherPortalApi";

export function PerformanceAlerts() {
  const { data: alerts = [], isLoading } = useGetTeacherAlertsQuery();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
          Loading performance alerts...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-200/50 bg-white/40 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
            <AlertTriangle className="h-4. w-4 text-rose-500" />
            Performance Alerts
          </h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Students needing academic or attendance interventions.
          </p>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
          alerts.length > 0
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        }`}>
          {alerts.length} Warnings
        </span>
      </div>

      {/* Alerts list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center text-zinc-400">
            <Sparkles className="h-10 w-10 text-emerald-500/30 mb-2" />
            <p className="text-xs font-semibold text-zinc-500">All students on track!</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">No low attendance or grade alarms triggered.</p>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const isLowAttendance = alert.reason === "LOW_ATTENDANCE";
            return (
              <div
                key={`${alert.studentProfileId}-${i}`}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all duration-200 ${
                  isLowAttendance
                    ? "bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10"
                    : "bg-rose-500/5 border-rose-500/15 hover:bg-rose-500/10"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  isLowAttendance
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}>
                  {isLowAttendance ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
                      {alert.fullName}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                      in {alert.classSectionName}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">
                    {isLowAttendance
                      ? "Attendance rate dropped below required threshold."
                      : "Cumulative grade percentage indicates academic danger."}
                  </p>

                  <div className="mt-2.5 flex items-center gap-1">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      isLowAttendance
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}>
                      {alert.metric}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
