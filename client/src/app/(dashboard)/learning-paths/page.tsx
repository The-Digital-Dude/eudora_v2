"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Route,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddCourseToPathMutation,
  useCreateLearningPathMutation,
  useGetCoursesQuery,
  useGetLearningPathDetailQuery,
  useGetLearningPathsQuery,
  useGetLearningSubjectsQuery,
  useRemoveCourseFromPathMutation,
  useReorderPathCoursesMutation,
} from "@/features/catalog/catalogApi";

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-success/10 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-destructive/10 text-destructive",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function LearningPathsPage() {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const [newPathSubjectId, setNewPathSubjectId] = useState("");
  const [newPathTitle, setNewPathTitle] = useState("");
  const [newPathUnlockMode, setNewPathUnlockMode] = useState<"SEQUENTIAL" | "FREE_ROAM">(
    "SEQUENTIAL",
  );
  const [courseToAdd, setCourseToAdd] = useState("");

  const { data: subjects } = useGetLearningSubjectsQuery();
  const { data: paths, isLoading: pathsLoading } = useGetLearningPathsQuery();
  const { data: pathDetail } = useGetLearningPathDetailQuery(selectedPathId ?? "", {
    skip: !selectedPathId,
  });

  const { data: subjectCourses } = useGetCoursesQuery(
    pathDetail ? { subjectId: pathDetail.learningSubjectId } : undefined,
    { skip: !pathDetail },
  );

  const [createLearningPath, { isLoading: creatingPath }] = useCreateLearningPathMutation();
  const [addCourseToPath, { isLoading: addingCourse }] = useAddCourseToPathMutation();
  const [removeCourseFromPath] = useRemoveCourseFromPathMutation();
  const [reorderPathCourses] = useReorderPathCoursesMutation();

  const handleOpenCreateDialog = () => {
    setFormError("");
    setNewPathSubjectId(subjects?.[0]?.id || "");
    setNewPathTitle("");
    setNewPathUnlockMode("SEQUENTIAL");
    setIsCreateDialogOpen(true);
  };

  const handleCreatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPathTitle || !newPathSubjectId) {
      setFormError("Subject and title are required.");
      return;
    }
    setFormError("");

    try {
      const created = await createLearningPath({
        learningSubjectId: newPathSubjectId,
        title: newPathTitle,
        slug: slugify(newPathTitle),
        unlockMode: newPathUnlockMode,
      }).unwrap();
      setIsCreateDialogOpen(false);
      setSelectedPathId(created.id);
      toast.success("Learning path created!");
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to create learning path.");
    }
  };

  const handleAddCourse = async () => {
    if (!selectedPathId || !courseToAdd) return;
    try {
      await addCourseToPath({ pathId: selectedPathId, courseId: courseToAdd }).unwrap();
      setCourseToAdd("");
      toast.success("Course added to path.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add course to path.");
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!selectedPathId) return;
    try {
      await removeCourseFromPath({ pathId: selectedPathId, courseId }).unwrap();
      toast.success("Course removed from path.");
    } catch {
      toast.error("Failed to remove course from path.");
    }
  };

  const handleMoveCourse = async (index: number, direction: "up" | "down") => {
    if (!selectedPathId || !pathDetail) return;
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
      await reorderPathCourses({ pathId: selectedPathId, courses: payload }).unwrap();
    } catch {
      toast.error("Failed to reorder path.");
    }
  };

  const availableCourses = (subjectCourses ?? []).filter(
    (course) => !pathDetail?.pathCourses.some((pc) => pc.courseId === course.id),
  );

  return (
    <div className="animate-fade-in space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Route className="h-7 w-7 text-primary" />
            Learning Path Curation
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sequence courses into a guided, step-by-step learning path within a subject.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateDialog}
          className="flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Create Path
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Path list */}
        <Card className="rounded-3xl border border-border bg-card p-5 lg:col-span-1">
          <h2 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-primary" />
            Paths
          </h2>

          {pathsLoading ? (
            <p className="text-xs text-muted-foreground">Loading paths...</p>
          ) : (paths ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No learning paths yet. Create one to sequence courses for learners.
            </p>
          ) : (
            <div className="space-y-2">
              {(paths ?? []).map((path) => (
                <button
                  key={path.id}
                  onClick={() => setSelectedPathId(path.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    selectedPathId === path.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{path.title}</span>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold capitalize ${statusColors[path.status] || ""}`}
                    >
                      {path.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {path.learningSubject.name} · {path._count.pathCourses} course
                    {path._count.pathCourses === 1 ? "" : "s"} ·{" "}
                    {path.unlockMode === "SEQUENTIAL" ? "Sequential" : "Free roam"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Path detail: ordered course sequence */}
        <Card className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
          {!pathDetail ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <GraduationCap className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                Select a learning path to curate its course sequence.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">
                  {pathDetail.title}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {pathDetail.learningSubject.name} ·{" "}
                  {pathDetail.unlockMode === "SEQUENTIAL"
                    ? "Learners must complete each course in order"
                    : "Learners may take courses in any order"}
                </p>
              </div>

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
                <p className="text-xs text-muted-foreground text-center py-8">
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
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
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
                          className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCourse(idx, "down")}
                          disabled={idx === pathDetail.pathCourses.length - 1}
                          className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(entry.courseId)}
                          className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Create Path Modal */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-1.5 text-base font-bold text-foreground">
              <Route className="h-4 w-4 text-primary" />
              Create Learning Path
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A curated, ordered sequence of courses within a subject.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleCreatePath} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Subject
              </Label>
              <select
                value={newPathSubjectId}
                onChange={(e) => setNewPathSubjectId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                required
              >
                <option value="" disabled>
                  Select subject
                </option>
                {(subjects ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Path Title
              </Label>
              <Input
                value={newPathTitle}
                onChange={(e) => setNewPathTitle(e.target.value)}
                placeholder="Foundational Math"
                className="h-10 border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Unlock Mode
              </Label>
              <select
                value={newPathUnlockMode}
                onChange={(e) => setNewPathUnlockMode(e.target.value as "SEQUENTIAL" | "FREE_ROAM")}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
              >
                <option value="SEQUENTIAL">Sequential — courses unlock in order</option>
                <option value="FREE_ROAM">Free roam — all courses open</option>
              </select>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingPath}
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {creatingPath ? "Creating..." : "Create Path"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
