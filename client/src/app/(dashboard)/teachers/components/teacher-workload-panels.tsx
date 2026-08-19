"use client";

import { BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import React from "react";

import { Card } from "@/components/ui/card";
import type { TeacherProfile } from "@/features/dashboard/dashboardApi";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/**
 * The commerce half of a teacher's workload.
 *
 * Sits alongside "Section Allocations", which covers the ClassSection spine.
 * Both are read-only here on purpose: courses are assigned from the course
 * page and lead teacher from the batch page, so duplicating those editors
 * would give the same relationship two owners.
 */
export function TeacherWorkloadPanels({ teacher }: { teacher: TeacherProfile }) {
  const courses = teacher.courseTeachers ?? [];
  const batches = teacher.leadBatches ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          Course Assignments
        </h2>
        <p className="mb-4 text-[10px] text-muted-foreground">
          Assigned from each course&apos;s own page.
        </p>

        {courses.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Not assigned to any course.
          </p>
        ) : (
          <ul className="space-y-2">
            {courses.map((ct) => (
              <li
                key={ct.courseId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2"
              >
                <Link
                  href={`/courses/${ct.courseId}`}
                  className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {ct.course.title}
                </Link>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                    {ct.course.deliveryMode}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                    {ct.role}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Batches Led
        </h2>
        <p className="mb-4 text-[10px] text-muted-foreground">
          Set as lead teacher from the batch page.
        </p>

        {batches.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Not leading any batch.
          </p>
        ) : (
          <ul className="space-y-2">
            {batches.map((b) => (
              <li
                key={b.id}
                className="rounded-xl border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {b.name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      b.isOpenForEnrollment
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.isOpenForEnrollment ? "OPEN" : "CLOSED"}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {b.course?.title ?? "No course"} · {b._count.enrollments} enrolled ·{" "}
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
