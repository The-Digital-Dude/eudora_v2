"use client";

import { ChevronRight, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import type { CourseSummary } from "@/features/catalog/catalogApi";

interface CourseTableProps {
  courses: CourseSummary[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-success/10 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-destructive/10 text-destructive",
};

export function CourseTable({ courses, isLoading }: CourseTableProps) {
  const router = useRouter();

  if (!isLoading && courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card py-16 text-center shadow-sm">
        <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-bold text-foreground">No courses found</h3>
        <p className="max-w-xs text-xs text-muted-foreground mt-1">
          Try adjusting your search, or author a course to populate the catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              <th className="px-6 py-4">Course</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Est. Hours</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Chapters</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {courses.map((course) => (
              <tr
                key={course.id}
                onClick={() => router.push(`/courses/${course.id}`)}
                className="cursor-pointer text-xs transition-colors hover:bg-muted/30"
              >
                <td className="px-6 py-4 font-semibold text-foreground">
                  <div className="flex items-center gap-3">
                    <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                      <GraduationCap className="h-4.5 w-4.5" />
                    </div>
                    <span className="max-w-[240px] truncate">{course.title}</span>
                  </div>
                </td>

                <td className="px-6 py-4 text-muted-foreground font-semibold">
                  {course.learningSubject.name}
                </td>

                <td className="px-6 py-4 text-muted-foreground font-semibold">
                  {course.estimatedHours ? `${course.estimatedHours}h` : "—"}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusColors[course.status] || ""}`}
                  >
                    {course.status.toLowerCase()}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {course._count.concepts}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
