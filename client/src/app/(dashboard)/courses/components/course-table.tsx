"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Circle, GraduationCap, Lock } from "lucide-react";
import Link from "next/link";
import React from "react";

import { useGetCourseDetailQuery } from "@/features/catalog/catalogApi";
import type { CourseSummary } from "@/features/catalog/catalogApi";

interface CourseTableProps {
  courses: CourseSummary[];
  isLoading?: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-success/10 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-destructive/10 text-destructive",
};

function CourseChapterList({ courseId }: { courseId: string }) {
  const { data: course, isLoading } = useGetCourseDetailQuery(courseId);
  const concepts = course?.concepts ?? [];

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2">Loading chapters...</p>;
  }

  if (concepts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No chapters have been authored for this course yet.
      </p>
    );
  }

  return (
    <div className="ml-4">
      {concepts.map((concept, idx) => {
        const isLast = idx === concepts.length - 1;
        return (
          <div key={concept.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && <span className="absolute left-[11px] top-6 h-full w-px bg-border" />}
            <span className="relative z-10 shrink-0 bg-muted/20">
              {concept.isDone ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : concept.isLocked ? (
                <Lock className="h-5 w-5 m-0.5 text-muted-foreground/40" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground/40" />
              )}
            </span>
            <div className="flex flex-1 items-center justify-between pt-0.5">
              <div>
                <p
                  className={`text-xs font-bold ${
                    concept.isDone
                      ? "text-foreground"
                      : concept.isLocked
                        ? "text-muted-foreground/60"
                        : "text-muted-foreground"
                  }`}
                >
                  {concept.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {concept.kind === "CHECKPOINT" ? "Checkpoint" : "Chapter"}
                  {concept.passThresholdPercent
                    ? ` · requires ${concept.passThresholdPercent}% to pass`
                    : ""}
                </p>
                {!concept.isLocked && concept.lessons.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {concept.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={`/learn/${lesson.id}`}
                        className="inline-flex items-center gap-0.5 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/10"
                      >
                        {lesson.title} <ChevronRight className="h-2.5 w-2.5" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {concept.isDone && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full">
                  Completed
                </span>
              )}
              {concept.isLocked && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Locked
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CourseTable({ courses, isLoading, expandedId, onToggleExpand }: CourseTableProps) {
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
            {courses.map((course) => {
              const isExpanded = expandedId === course.id;

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
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-muted/20">
                      <td colSpan={5} className="px-6 py-5">
                        <CourseChapterList courseId={course.id} />
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
