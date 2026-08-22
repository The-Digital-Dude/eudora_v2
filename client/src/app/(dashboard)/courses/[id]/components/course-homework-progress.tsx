"use client";

import { AlertTriangle, CheckCircle2, Clock, Loader2, Minus } from "lucide-react";
import React from "react";

import {
  type CheckpointCellStatus,
  useGetCourseHomeworkProgressQuery,
} from "@/features/academic/homeworkApi";

/**
 * Who has done what, for one course.
 *
 * A grid rather than a list because the question is comparative — not "how is
 * Ada doing" but "who is behind" — and a matrix answers that at a glance where
 * a per-learner list makes you hold ten rows in your head.
 *
 * Learners come from entitlements, not batch enrolments: a self-paced learner
 * is never in a cohort, and entitlement is what makes them this teacher's
 * responsibility.
 */
export function CourseHomeworkProgress({ courseId }: { courseId: string }) {
  const { data, isLoading } = useGetCourseHomeworkProgressQuery(courseId);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const { learners, checkpoints } = data;

  if (checkpoints.length === 0) {
    return (
      <p className="border-border bg-card rounded-2xl border px-5 py-4 text-[11px] text-muted-foreground">
        No homework checkpoints in this course yet. Add one above. The item kind
        is &ldquo;Homework&rdquo;.
      </p>
    );
  }
  if (learners.length === 0) {
    return (
      <p className="border-border bg-card rounded-2xl border px-5 py-4 text-[11px] text-muted-foreground">
        Nobody is enrolled on this course yet, so there is no one to track.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {(
          [
            ["GRADED", "Marked"],
            ["SUBMITTED", "Waiting to be marked"],
            ["LATE", "Late"],
            ["NOT_STARTED", "Not started"],
          ] as const
        ).map(([status, label]) => (
          <span key={status} className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
            <StatusMark status={status} />
            {label}
          </span>
        ))}
      </div>

      {/* Wide grids scroll inside their own box rather than pushing the page
          sideways. */}
      <div className="border-border overflow-x-auto rounded-2xl border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              <th className="text-muted-foreground sticky left-0 z-10 bg-inherit px-4 py-3 text-[10px] font-bold tracking-wider uppercase">
                Learner
              </th>
              {checkpoints.map((checkpoint) => (
                <th
                  key={checkpoint.homeworkId}
                  className="text-muted-foreground min-w-[120px] px-3 py-3 text-[10px] font-bold"
                >
                  <span className="text-foreground block truncate">{checkpoint.title}</span>
                  <span className="mt-0.5 block truncate font-normal">
                    {checkpoint.chapter ?? "Unfiled"} · {checkpoint.maxPoints} marks
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {learners.map((learner) => (
              <tr key={learner.id} className="border-border border-b last:border-0">
                <td className="text-foreground bg-card sticky left-0 z-10 px-4 py-2.5 text-xs font-semibold">
                  {learner.fullName}
                </td>
                {checkpoints.map((checkpoint) => {
                  const cell = checkpoint.cells.find(
                    (c) => c.studentProfileId === learner.id,
                  );
                  return (
                    <td key={checkpoint.homeworkId} className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <StatusMark status={cell?.status ?? "NOT_STARTED"} />
                        <span className="text-muted-foreground text-[10px]">
                          {cell?.status === "GRADED"
                            ? `${cell.pointsEarned}/${checkpoint.maxPoints}`
                            : cellLabel(cell?.status ?? "NOT_STARTED")}
                        </span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Status never rides on colour alone — each state has its own shape, so it
 * survives colourblindness, greyscale printing and a glance.
 */
function StatusMark({ status }: { status: CheckpointCellStatus }) {
  switch (status) {
    case "GRADED":
      return <CheckCircle2 className="text-success h-3.5 w-3.5 shrink-0" />;
    case "SUBMITTED":
    case "PENDING":
      return <Clock className="text-primary h-3.5 w-3.5 shrink-0" />;
    case "LATE":
      return <AlertTriangle className="text-warning h-3.5 w-3.5 shrink-0" />;
    default:
      return <Minus className="text-muted-foreground h-3.5 w-3.5 shrink-0" />;
  }
}

function cellLabel(status: CheckpointCellStatus): string {
  switch (status) {
    case "SUBMITTED":
    case "PENDING":
      return "To mark";
    case "LATE":
      return "Late";
    default:
      return "—";
  }
}
