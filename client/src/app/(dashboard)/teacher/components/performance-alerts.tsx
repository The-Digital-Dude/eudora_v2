"use client";

import { AlertTriangle, Sparkles,TrendingDown, UserCheck } from "lucide-react";
import React from "react";

import { useGetTeacherAlertsQuery } from "@/features/teacher/teacherPortalApi";

export function PerformanceAlerts() {
  const { data: alerts = [], isLoading } = useGetTeacherAlertsQuery();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl backdrop-blur-md flex-1 min-h-[280px]">
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Loading performance alerts...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 shadow-xl backdrop-blur-md overflow-hidden flex flex-col flex-1 min-h-[280px]">
      {/* Header */}
      <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Performance Alerts
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Students needing academic or attendance interventions.
          </p>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
          alerts.length > 0
            ? "bg-destructive/10 text-destructive"
            : "bg-success/10 text-success"
        }`}>
          {alerts.length} Warnings
        </span>
      </div>

      {/* Alerts list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 text-success/30 mb-2" />
            <p className="text-xs font-semibold text-foreground">All students on track!</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">No low attendance or grade alarms triggered.</p>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const isLowAttendance = alert.reason === "LOW_ATTENDANCE";
            return (
              <div
                key={`${alert.studentProfileId}-${i}`}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all duration-200 ${
                  isLowAttendance
                    ? "bg-warning/5 border-warning/15 hover:bg-warning/10"
                    : "bg-destructive/5 border-destructive/15 hover:bg-destructive/10"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  isLowAttendance
                    ? "bg-warning/10 text-warning"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {isLowAttendance ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-foreground">
                      {alert.fullName}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground">
                      in {alert.classSectionName}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {isLowAttendance
                      ? "Attendance rate dropped below required threshold."
                      : "Cumulative grade percentage indicates academic danger."}
                  </p>

                  <div className="mt-2.5 flex items-center gap-1">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      isLowAttendance
                        ? "bg-warning/15 text-warning"
                        : "bg-destructive/15 text-destructive"
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
