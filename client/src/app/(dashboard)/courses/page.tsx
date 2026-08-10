"use client";

import { AlertCircle, BookPlus, FolderPlus, GraduationCap, Search } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  useCreateCourseMutation,
  useCreateLearningSubjectMutation,
  useGetCoursesQuery,
  useGetLearningSubjectsQuery,
} from "@/features/catalog/catalogApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

import { CourseTable } from "./components/course-table";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CoursesPage() {
  // Subject and search live in the URL so a filtered catalogue view can be shared. Search stays a
  // client-side pass on purpose: listCourses returns every matching course unpaginated, so there's
  // nothing for a server-side search to protect against here.
  const { values, setValue } = useListQueryState({ search: "", subjectId: "all" });
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );
  const subjectId = values.subjectId;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [subjectFormError, setSubjectFormError] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");

  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [courseFormError, setCourseFormError] = useState("");
  const [newCourseSubjectId, setNewCourseSubjectId] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseEstimatedHours, setNewCourseEstimatedHours] = useState("");

  const { data: subjects } = useGetLearningSubjectsQuery();
  const { data: courses, isLoading } = useGetCoursesQuery(
    subjectId === "all" ? undefined : { subjectId },
  );

  const [createLearningSubject, { isLoading: creatingSubject }] =
    useCreateLearningSubjectMutation();
  const [createCourse, { isLoading: creatingCourse }] = useCreateCourseMutation();

  const filteredCourses = (courses ?? []).filter((course) => {
    const query = values.search.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      course.learningSubject.name.toLowerCase().includes(query)
    );
  });

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleOpenSubjectDialog = () => {
    setSubjectFormError("");
    setNewSubjectCode("");
    setNewSubjectName("");
    setNewSubjectDescription("");
    setIsSubjectDialogOpen(true);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectCode || !newSubjectName) {
      setSubjectFormError("Code and name are required.");
      return;
    }
    setSubjectFormError("");

    try {
      await createLearningSubject({
        code: newSubjectCode,
        name: newSubjectName,
        description: newSubjectDescription || undefined,
      }).unwrap();
      setIsSubjectDialogOpen(false);
      toast.success("Subject created!");
    } catch (err: any) {
      setSubjectFormError(err?.data?.message || "Failed to create subject.");
    }
  };

  const handleOpenCourseDialog = () => {
    setCourseFormError("");
    setNewCourseSubjectId(subjects?.[0]?.id || "");
    setNewCourseTitle("");
    setNewCourseDescription("");
    setNewCourseEstimatedHours("");
    setIsCourseDialogOpen(true);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle || !newCourseSubjectId) {
      setCourseFormError("Subject and title are required.");
      return;
    }
    setCourseFormError("");

    try {
      await createCourse({
        learningSubjectId: newCourseSubjectId,
        title: newCourseTitle,
        slug: slugify(newCourseTitle),
        description: newCourseDescription || undefined,
        estimatedHours: newCourseEstimatedHours ? Number(newCourseEstimatedHours) : undefined,
      }).unwrap();
      setIsCourseDialogOpen(false);
      toast.success("Course created!");
    } catch (err: any) {
      setCourseFormError(err?.data?.message || "Failed to create course.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Courses
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse the learning catalog and track chapter progress across each course.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenSubjectDialog}
            variant="outline"
            className="flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl border-border px-4 text-xs font-bold"
          >
            <FolderPlus className="h-4 w-4" /> Create Subject
          </Button>
          <Button
            onClick={handleOpenCourseDialog}
            className="flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            <BookPlus className="h-4 w-4" /> Create Course
          </Button>
        </div>
      </div>

      {/* Search Bar + Subject Filter */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses by title or subject..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="h-10 rounded-xl border-border bg-muted/50 pl-10 text-xs"
          />
        </div>
        <select
          value={subjectId}
          onChange={(e) => setValue("subjectId", e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
        >
          <option value="all">All Subjects</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Course Directory Table */}
      <CourseTable
        courses={filteredCourses}
        isLoading={isLoading}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
      />

      {/* Create Subject Modal */}
      <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-1.5 text-base font-bold text-foreground">
              <FolderPlus className="h-4 w-4 text-primary" />
              Create Subject
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A top-level subject area that groups related courses.
            </DialogDescription>
          </DialogHeader>

          {subjectFormError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {subjectFormError}
            </div>
          )}

          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Code
              </Label>
              <Input
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value)}
                placeholder="MATH"
                className="h-10 border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Name
              </Label>
              <Input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Mathematics"
                className="h-10 border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Description (optional)
              </Label>
              <Input
                value={newSubjectDescription}
                onChange={(e) => setNewSubjectDescription(e.target.value)}
                placeholder="A short description of this subject"
                className="h-10 border-border text-xs"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSubjectDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingSubject}
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {creatingSubject ? "Creating..." : "Create Subject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Course Modal */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-1.5 text-base font-bold text-foreground">
              <BookPlus className="h-4 w-4 text-primary" />
              Create Course
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A new course within a subject. Chapters can be added once it exists.
            </DialogDescription>
          </DialogHeader>

          {courseFormError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {courseFormError}
            </div>
          )}

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Subject
              </Label>
              <select
                value={newCourseSubjectId}
                onChange={(e) => setNewCourseSubjectId(e.target.value)}
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
                Course Title
              </Label>
              <Input
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="Algebra Fundamentals"
                className="h-10 border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Description (optional)
              </Label>
              <Input
                value={newCourseDescription}
                onChange={(e) => setNewCourseDescription(e.target.value)}
                placeholder="A short description of this course"
                className="h-10 border-border text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Estimated Hours (optional)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={newCourseEstimatedHours}
                onChange={(e) => setNewCourseEstimatedHours(e.target.value)}
                placeholder="10"
                className="h-10 border-border text-xs"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCourseDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingCourse}
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {creatingCourse ? "Creating..." : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
