"use client";

import { CheckCircle2, ChevronDown, Circle, GraduationCap } from "lucide-react";
import React from "react";

import type { Course } from "./dummy-courses";

interface CourseTableProps {
  courses: Course[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

const statusColors: Record<string, string> = {
  published: "bg-success/10 text-success",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-destructive/10 text-destructive",
};

const stepTypeLabels: Record<string, string> = {
  video: "Video",
  reading: "Reading",
  quiz: "Quiz",
  assignment: "Assignment",
};

export function CourseTable({ courses, expandedId, onToggleExpand }: CourseTableProps) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card py-16 text-center shadow-sm">
        <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-bold text-foreground">No courses found</h3>
        <p className="max-w-xs text-xs text-muted-foreground mt-1">
          Try adjusting your search to find the course you&apos;re looking for.
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
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Instructor</th>
              <th className="px-6 py-4">Progress</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Steps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {courses.map((course) => {
              const isExpanded = expandedId === course.id;
              const total = course.steps.length;
              const completed = course.steps.filter((s) => s.completed).length;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <React.Fragment key={course.id}>
                  <tr
                    onClick={() => onToggleExpand(course.id)}
                    className="cursor-pointer text-xs transition-colors hover:bg-muted/50/30"
                  >
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                          <GraduationCap className="h-4.5 w-4.5" />
                        </div>
                        <span className="max-w-[240px] truncate">{course.title}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-muted-foreground font-semibold">{course.category}</td>

                    <td className="px-6 py-4 text-muted-foreground font-semibold">{course.instructor}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{pct}%</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusColors[course.status] || ""}`}
                      >
                        {course.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {completed}/{total}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-muted/20">
                      <td colSpan={6} className="px-6 py-5">
                        <div className="ml-4">
                          {course.steps.map((step, idx) => {
                            const isLast = idx === course.steps.length - 1;
                            return (
                              <div key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                                {!isLast && (
                                  <span className="absolute left-[11px] top-6 h-full w-px bg-border" />
                                )}
                                <span className="relative z-10 shrink-0 bg-muted/20">
                                  {step.completed ? (
                                    <CheckCircle2 className="h-6 w-6 text-success" />
                                  ) : (
                                    <Circle className="h-6 w-6 text-muted-foreground/40" />
                                  )}
                                </span>
                                <div className="flex flex-1 items-center justify-between pt-0.5">
                                  <div>
                                    <p
                                      className={`text-xs font-bold ${step.completed ? "text-foreground" : "text-muted-foreground"}`}
                                    >
                                      {step.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {stepTypeLabels[step.type]}
                                    </p>
                                  </div>
                                  {step.completed && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
