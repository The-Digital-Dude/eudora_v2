"use client";

import { BookOpen, Plus, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGetCoursesQuery } from "@/features/catalog/catalogApi";
import {
  type Program,
  useAttachProgramCourseMutation,
  useDetachProgramCourseMutation,
} from "@/features/dashboard/dashboardApi";

/**
 * Manages the Program <-> Course join. A course can sit in several programs at
 * once (Class 9 and Class 10 Science both teach Physics), so attaching here
 * never moves a course out of anything else.
 */
export function ProgramCoursesPanel({ program }: { program: Program }) {
  const { data: coursesData } = useGetCoursesQuery({ limit: 200 });
  const [attachCourse, { isLoading: isAttaching }] = useAttachProgramCourseMutation();
  const [detachCourse] = useDetachProgramCourseMutation();
  const [selectedCourseId, setSelectedCourseId] = React.useState("");

  const attached = program.programCourses ?? [];
  const attachedIds = new Set(attached.map((link) => link.course.id));
  const available = (coursesData?.items ?? []).filter((c) => !attachedIds.has(c.id));

  const handleAttach = async () => {
    if (!selectedCourseId) return;
    try {
      await attachCourse({ programId: program.id, courseId: selectedCourseId }).unwrap();
      setSelectedCourseId("");
      toast.success("Course attached");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to attach course.");
    }
  };

  const handleDetach = async (courseId: string) => {
    try {
      await detachCourse({ programId: program.id, courseId }).unwrap();
      toast.success("Course detached");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to detach course.");
    }
  };

  return (
    <Card className="w-full space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="space-y-1">
        <h2 className="font-display text-sm font-bold text-foreground">Courses</h2>
        <p className="text-[11px] text-muted-foreground">
          What this program includes. Courses stay reusable across programs.
        </p>
      </div>

      {attached.length > 0 ? (
        <ul className="space-y-1.5">
          {attached.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/80 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs font-semibold text-foreground">
                  {link.course.title}
                </span>
                {link.course.status !== "PUBLISHED" && (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                    {link.course.status}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => handleDetach(link.course.id)}
                aria-label={`Detach ${link.course.title}`}
                className="shrink-0 cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-[11px] text-muted-foreground">
          No courses attached yet.
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        >
          <option value="">Select a course to add…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          onClick={handleAttach}
          disabled={!selectedCourseId || isAttaching}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-3 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </Card>
  );
}
