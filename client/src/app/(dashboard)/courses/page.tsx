"use client";

import { AlertCircle, BookPlus, FolderPlus, GraduationCap, Search } from "lucide-react";
import Link from "next/link";
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
  useCreateLearningSubjectMutation,
  useGetCoursesQuery,
  useGetLearningSubjectsQuery,
} from "@/features/catalog/catalogApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

import { CourseTable } from "./components/course-table";

export default function CoursesPage() {
  // Subject and search live in the URL so a filtered catalogue view can be shared. Search stays a
  // client-side pass on purpose: listCourses returns every matching course unpaginated, so there's
  // nothing for a server-side search to protect against here.
  const { values, setValue } = useListQueryState({ search: "", subjectId: "all" });
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );
  const subjectId = values.subjectId;

  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [subjectFormError, setSubjectFormError] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");

  const { data: subjects } = useGetLearningSubjectsQuery();
  const { data: courses, isLoading } = useGetCoursesQuery(
    subjectId === "all" ? undefined : { subjectId },
  );

  const [createLearningSubject, { isLoading: creatingSubject }] =
    useCreateLearningSubjectMutation();

  const filteredCourses = (courses ?? []).filter((course) => {
    const query = values.search.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      course.learningSubject.name.toLowerCase().includes(query)
    );
  });

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
            asChild
            className="flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            <Link href="/courses/create">
              <BookPlus className="h-4 w-4" /> Create Course
            </Link>
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
      <CourseTable courses={filteredCourses} isLoading={isLoading} />

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
    </div>
  );
}
