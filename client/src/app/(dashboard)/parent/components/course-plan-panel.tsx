"use client";

import { AlertCircle, BookOpen, Check, Loader2, Plus, Search, Sparkles, Trash, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AvailableCourse,
  useAssignCourseMutation,
  useGetAvailableCoursesQuery,
  useGetCourseAssignmentsQuery,
  useGetRecommendedCoursesQuery,
  useRemoveCourseAssignmentMutation,
} from "@/features/parent/parentApi";

import { CoursePreviewDialog } from "./course-preview-dialog";

const GRADE_BAND_LABELS: Record<string, string> = {
  PRE_K_K: "Pre-K/K",
  G1_2: "Grades 1-2",
  G3_4: "Grades 3-4",
  G5_6: "Grades 5-6",
};

/**
 * Says what the suggestion is actually based on. The server distinguishes
 * these, and collapsing them into a single "Recommended" would overstate a
 * grade-band guess as a curriculum decision.
 */
const BASIS_BLURB: Record<string, string> = {
  CLASS: "From the programmes for their grade level",
  GRADE_BAND: "Matched to their age",
  POPULAR: "Popular courses to get started",
};

const PAGE_SIZE = 12;

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
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [previewCourseId, setPreviewCourseId] = React.useState<string | null>(null);

  // Debounced so typing doesn't fire a request per keystroke; the server now
  // paginates, so each one is a real query rather than a client-side filter.
  React.useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: availablePage, isFetching: isAvailableLoading } = useGetAvailableCoursesQuery(
    { studentProfileId, search: search || undefined, page, limit: PAGE_SIZE },
    { skip: !studentProfileId },
  );
  const { data: recommended } = useGetRecommendedCoursesQuery(studentProfileId, {
    skip: !studentProfileId,
  });
  const { data: assignments = [], isLoading: isPlanLoading } = useGetCourseAssignmentsQuery(
    studentProfileId,
    { skip: !studentProfileId },
  );
  const [assignCourse, { isLoading: isAssigning }] = useAssignCourseMutation();
  const [removeCourseAssignment] = useRemoveCourseAssignmentMutation();

  const [error, setError] = React.useState("");
  const [pendingCourseId, setPendingCourseId] = React.useState("");

  const available = availablePage?.items ?? [];
  const total = availablePage?.total ?? 0;
  const unassigned = available.filter((course) => !course.isAssigned);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Suggestions the guardian has since added should drop out without waiting
  // for a refetch of the recommendation list.
  const assignedIds = new Set(assignments.map((a) => a.courseId));
  const recommendations = (recommended?.items ?? []).filter((c) => !assignedIds.has(c.id));

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

  const renderCourseRow = (course: AvailableCourse) => (
    <div
      key={course.id}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <button
        type="button"
        onClick={() => setPreviewCourseId(course.id)}
        className="min-w-0 flex-1 cursor-pointer text-left"
      >
        <p className="truncate text-xs font-semibold text-foreground hover:underline">
          {course.title}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {course.learningSubject.name} · {course._count.concepts} chapters
          {course.gradeBand ? ` · ${GRADE_BAND_LABELS[course.gradeBand]}` : ""}
        </p>
      </button>
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
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Recommended for {childName}
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            {BASIS_BLURB[recommended?.basis ?? "POPULAR"]}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {recommendations.map(renderCourseRow)}
          </div>
        </div>
      )}

      {isPlanLoading ? (
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
                    <button
                      type="button"
                      onClick={() => setPreviewCourseId(assignment.courseId)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <p className="truncate text-xs font-semibold text-foreground hover:underline">
                        {assignment.course.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {assignment.course.learningSubject.name} ·{" "}
                        {assignment.course._count.concepts} chapters
                        {assignment.course.gradeBand
                          ? ` · ${GRADE_BAND_LABELS[assignment.course.gradeBand]}`
                          : ""}
                      </p>
                    </button>
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
              Browse courses
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Everything offered at {childName}&apos;s campus.
            </p>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search courses"
                aria-label="Search courses"
                className="h-9 rounded-xl pr-8 pl-9 text-xs"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {isAvailableLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : unassigned.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {search
                  ? `No courses match "${search}".`
                  : available.length === 0
                    ? "No courses are available at this campus yet."
                    : "Every available course is already in the plan."}
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {unassigned.map(renderCourseRow)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  variant="outline"
                  className="h-8 rounded-lg px-3 text-[10px] font-semibold"
                >
                  Previous
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  variant="outline"
                  className="h-8 rounded-lg px-3 text-[10px] font-semibold"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <CoursePreviewDialog
        courseId={previewCourseId}
        onClose={() => setPreviewCourseId(null)}
        onAdd={handleAssign}
      />
    </div>
  );
}
