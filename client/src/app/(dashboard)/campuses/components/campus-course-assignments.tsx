"use client";

import { AlertCircle, Trash } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useAssignCourseToCampusMutation,
  useGetCampusCoursesQuery,
  useRemoveCampusCourseMutation,
  useUpdateCampusCourseMutation,
} from "@/features/dashboard/dashboardApi";
import { useGetCoursesQuery } from "@/features/catalog/catalogApi";

const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none";
const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

/**
 * A course with no row here is visible to every campus by default (see
 * `CampusCourse` in schema.prisma) — this panel only manages the explicit
 * restriction/override list for this one campus, not the full catalog.
 */
export function CampusCourseAssignments({ campusId }: { campusId: string }) {
  const { data: courses } = useGetCoursesQuery();
  const { data: assignments } = useGetCampusCoursesQuery(campusId);
  const [assignCourse, { isLoading: assigning }] = useAssignCourseToCampusMutation();
  const [updateCourse] = useUpdateCampusCourseMutation();
  const [removeCourse] = useRemoveCampusCourseMutation();

  const [courseId, setCourseId] = React.useState("");
  const [error, setError] = React.useState("");

  const assignedCourseIds = new Set((assignments ?? []).map((a) => a.courseId));
  const availableCourses = (courses ?? []).filter((c) => !assignedCourseIds.has(c.id));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      setError("Course is required.");
      return;
    }
    setError("");
    try {
      await assignCourse({ campusId, courseId }).unwrap();
      setCourseId("");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to assign course to campus.");
    }
  };

  const handleToggle = async (targetCourseId: string, enabled: boolean) => {
    try {
      await updateCourse({ campusId, courseId: targetCourseId, enabled }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to update course access.");
    }
  };

  const handleRemove = async (targetCourseId: string) => {
    if (!confirm("Remove this course restriction? The course becomes visible to every campus again unless it has other campus assignments.")) return;
    try {
      await removeCourse({ campusId, courseId: targetCourseId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to remove course assignment.");
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Courses with no restriction here are visible to this campus by default. Only assign a
        course if it should be restricted to specific campuses (e.g. a premium/plan-gated
        course) — assigning the first campus makes that course invisible to every other campus
        unless they're also assigned.
      </p>

      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="grid grid-cols-3 items-end gap-3 rounded-2xl border border-border bg-muted/50 p-4"
      >
        <div className="col-span-2 space-y-1">
          <Label className={labelClass}>Course</Label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className={selectClass}
            required
          >
            <option value="" disabled>
              Select Course
            </option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          disabled={assigning}
          className="h-10 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          {assigning ? "Assigning..." : "Restrict to Campus"}
        </Button>
      </form>

      <div className="space-y-2">
        <h3 className={labelClass}>Restricted Courses</h3>
        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {assignments && assignments.length > 0 ? (
            assignments.map((a) => (
              <div
                key={a.courseId}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">{a.course.title}</p>
                  <p className={`text-[9px] font-semibold ${a.enabled ? "text-success" : "text-muted-foreground"}`}>
                    {a.enabled ? "Enabled for this campus" : "Disabled for this campus"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleToggle(a.courseId, !a.enabled)}
                    variant="outline"
                    className="h-8 rounded-lg border-border px-3 text-[10px] font-semibold"
                  >
                    {a.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    onClick={() => handleRemove(a.courseId)}
                    variant="outline"
                    className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-3 text-center text-xs font-medium text-muted-foreground">
              No course restrictions — this campus sees the full public catalog.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
