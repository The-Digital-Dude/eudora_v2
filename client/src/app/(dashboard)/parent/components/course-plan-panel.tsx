"use client";

import { AlertCircle, BookOpen, Check, Loader2, Plus, Trash } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  useAssignCourseMutation,
  useGetAvailableCoursesQuery,
  useGetCourseAssignmentsQuery,
  useRemoveCourseAssignmentMutation,
} from "@/features/parent/parentApi";

const GRADE_BAND_LABELS: Record<string, string> = {
  PRE_K_K: "Pre-K/K",
  G1_2: "Grades 1-2",
  G3_4: "Grades 3-4",
  G5_6: "Grades 5-6",
};

interface CoursePlanPanelProps {
  studentProfileId: string;
  childName: string;
}

/**
 * Guardian-editable learning plan — the one place in the parent portal that
 * writes. Only lists courses the child's own campus can see (the server
 * re-checks that on every assign, so this list is convenience, not the
 * security boundary).
 */
export function CoursePlanPanel({ studentProfileId, childName }: CoursePlanPanelProps) {
  const { data: available = [], isLoading: isAvailableLoading } = useGetAvailableCoursesQuery(
    studentProfileId,
    { skip: !studentProfileId },
  );
  const { data: assignments = [], isLoading: isPlanLoading } = useGetCourseAssignmentsQuery(
    studentProfileId,
    { skip: !studentProfileId },
  );
  const [assignCourse, { isLoading: isAssigning }] = useAssignCourseMutation();
  const [removeCourseAssignment] = useRemoveCourseAssignmentMutation();

  const [error, setError] = React.useState("");
  const [pendingCourseId, setPendingCourseId] = React.useState("");

  const unassigned = available.filter((course) => !course.isAssigned);

  const handleAssign = async (courseId: string) => {
    setError("");
    setPendingCourseId(courseId);
    try {
      await assignCourse({ studentProfileId, courseId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to add this course to the plan.");
    } finally {
      setPendingCourseId("");
    }
  };

  const handleRemove = async (courseId: string) => {
    if (!confirm(`Remove this course from ${childName}'s learning plan?`)) return;
    setError("");
    try {
      await removeCourseAssignment({ studentProfileId, courseId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to remove this course.");
    }
  };

  const isLoading = isAvailableLoading || isPlanLoading;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Current plan */}
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Check className="h-4 w-4 text-success" />
              {childName}&apos;s learning plan
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Courses you&apos;ve chosen. These show up as &quot;Chosen for you&quot; in their app.
            </p>

            {assignments.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No courses chosen yet. Add one from the list on the right.
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.courseId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {assignment.course.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {assignment.course.learningSubject.name} ·{" "}
                        {assignment.course._count.concepts} chapters
                        {assignment.course.gradeBand
                          ? ` · ${GRADE_BAND_LABELS[assignment.course.gradeBand]}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemove(assignment.courseId)}
                      variant="outline"
                      className="h-8 shrink-0 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Browse */}
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              Available courses
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Everything offered at {childName}&apos;s campus.
            </p>

            {unassigned.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {available.length === 0
                  ? "No courses are available at this campus yet."
                  : "Every available course is already in the plan."}
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {unassigned.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {course.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {course.learningSubject.name} · {course._count.concepts} chapters
                        {course.gradeBand ? ` · ${GRADE_BAND_LABELS[course.gradeBand]}` : ""}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleAssign(course.id)}
                      disabled={isAssigning && pendingCourseId === course.id}
                      variant="outline"
                      className="h-8 shrink-0 gap-1 rounded-lg px-3 text-[10px] font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isAssigning && pendingCourseId === course.id ? "Adding..." : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
