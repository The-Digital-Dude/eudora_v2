"use client";

import { CalendarClock, Radio, Users, Video } from "lucide-react";
import Link from "next/link";
import React from "react";

import type { TeacherBatchOverview } from "@/features/teacher/teacherPortalApi";

interface BatchesOverviewProps {
  batches: TeacherBatchOverview[];
  isLoading: boolean;
}

// The commerce-spine counterpart to ClassesOverview. Deliberately its own
// card grid rather than extra rows in that one: a section is marked present
// once a day, a batch once per session, so the two cannot share a status
// line without one of them lying.
export function BatchesOverview({ batches, isLoading }: BatchesOverviewProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading batches...
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/40 p-6">
        <p className="text-xs text-muted-foreground">
          You&apos;re not assigned to any batches yet. An admin assigns you to a
          course or makes you the lead teacher of a cohort.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {batches.map((b) => {
        const next = b.nextSession;
        const isLive = next?.status === "LIVE";

        return (
          <div
            key={b.batchId}
            className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/50"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {b.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {b.code}
                  {b.course && ` · ${b.course.title}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  b.role === "LEAD"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {b.role === "LEAD" ? "LEAD" : "TEACHING"}
              </span>
            </div>

            <div className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {b.enrolledCount} enrolled
            </div>

            {next ? (
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {next.startTime
                    ? new Date(next.startTime).toLocaleString([], {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : new Date(next.date).toLocaleDateString()}
                  {isLive && (
                    <span className="animate-pulse rounded-full bg-destructive px-1.5 py-0.5 text-[8px] text-white">
                      LIVE
                    </span>
                  )}
                </div>
                {(next.topic || next.moduleItem) && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    {next.topic ?? next.moduleItem?.title}
                  </p>
                )}
                {next.startUrl && (
                  <a
                    href={next.startUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    <Video className="h-3 w-3" /> Start session
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-3">
                <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Radio className="h-3 w-3" />
                  No upcoming session scheduled
                </p>
              </div>
            )}

            <Link
              href={`/live-classes?batchId=${b.batchId}`}
              className="mt-3 inline-block text-[10px] font-bold text-primary hover:underline"
            >
              Manage sessions
            </Link>
          </div>
        );
      })}
    </div>
  );
}
