"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useAddCourseToPathMutation,
  useGetCoursesQuery,
  useGetLearningPathDetailQuery,
  useRemoveCourseFromPathMutation,
  useReorderPathCoursesMutation,
} from "@/features/catalog/catalogApi";

export default function LearningPathDetailPage() {
  const params = useParams<{ id: string }>();
  const pathId = params?.id ?? "";

  const { data: pathDetail, isLoading } = useGetLearningPathDetailQuery(pathId, {
    skip: !pathId,
  });
  const { data: subjectCoursesData } = useGetCoursesQuery(
    pathDetail ? { subjectId: pathDetail.learningSubjectId } : undefined,
    { skip: !pathDetail },
  );
  const subjectCourses = subjectCoursesData?.items;

  const [addCourseToPath, { isLoading: addingCourse }] = useAddCourseToPathMutation();
  const [removeCourseFromPath] = useRemoveCourseFromPathMutation();
  const [reorderPathCourses] = useReorderPathCoursesMutation();

  const [courseToAdd, setCourseToAdd] = React.useState("");

  const handleAddCourse = async () => {
    if (!pathId || !courseToAdd) return;
    try {
      await addCourseToPath({ pathId, courseId: courseToAdd }).unwrap();
      setCourseToAdd("");
      toast.success("Course added to path.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add course to path.");
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!pathId) return;
    try {
      await removeCourseFromPath({ pathId, courseId }).unwrap();
      toast.success("Course removed from path.");
    } catch {
      toast.error("Failed to remove course from path.");
    }
  };

  const handleMoveCourse = async (index: number, direction: "up" | "down") => {
    if (!pathId || !pathDetail) return;
    const items = [...pathDetail.pathCourses];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    const payload = items.map((entry, idx) => ({
      courseId: entry.courseId,
      sortOrder: idx + 1,
    }));

    try {
      await reorderPathCourses({ pathId, courses: payload }).unwrap();
    } catch {
      toast.error("Failed to reorder path.");
    }
  };

  const availableCourses = (subjectCourses ?? []).filter(
    (course) => !pathDetail?.pathCourses.some((pc) => pc.courseId === course.id),
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pathDetail) {
    return (
      <div className="space-y-3">
        <Link
          href="/learning-paths"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Learning Paths
        </Link>
        <p className="text-sm font-semibold text-foreground">Learning path not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 font-sans">
      <div className="space-y-1">
        <Link
          href="/learning-paths"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Learning Paths
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          {pathDetail.title}
        </h1>
        <p className="text-xs text-muted-foreground">
          {pathDetail.learningSubject.name} ·{" "}
          {pathDetail.unlockMode === "SEQUENTIAL"
            ? "Learners must complete each course in order"
            : "Learners may take courses in any order"}
        </p>
      </div>

      <Card className="max-w-2xl space-y-5 rounded-3xl border border-border bg-card p-6">
        {/* Add course row */}
        <div className="flex gap-2 rounded-2xl border border-dashed border-border p-3">
          <select
            value={courseToAdd}
            onChange={(e) => setCourseToAdd(e.target.value)}
            className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
          >
            <option value="">Select a course to add...</option>
            {availableCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <Button
            onClick={handleAddCourse}
            disabled={!courseToAdd || addingCourse}
            className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            {addingCourse ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
          </Button>
        </div>

        {/* Ordered course list */}
        {pathDetail.pathCourses.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No courses in this path yet. Add one above to start the sequence.
          </p>
        ) : (
          <div className="space-y-2">
            {pathDetail.pathCourses.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3"
              >
                <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    {entry.course.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {entry.course._count.concepts} chapter
                    {entry.course._count.concepts === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveCourse(idx, "up")}
                    disabled={idx === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCourse(idx, "down")}
                    disabled={idx === pathDetail.pathCourses.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCourse(entry.courseId)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
