"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { AlertCircle, BookPlus, ChevronRight, FolderPlus, GraduationCap, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

import { DataTable, SortableHeader } from "@/components/data-table";
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
  type CourseSummary,
  useCreateLearningSubjectMutation,
  useGetCoursesQuery,
  useGetLearningSubjectsQuery,
} from "@/features/catalog/catalogApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-success/10 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-destructive/10 text-destructive",
};

export default function CoursesPage() {
  const router = useRouter();
  // Subject, search, sort and page all live in the URL so a filtered catalogue view can be shared.
  const { values, setValue, setValues } = useListQueryState(
    { search: "", subjectId: "all", page: 1, sortBy: "", sortOrder: "asc" },
    { pageKey: "page" },
  );
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
  const { data: coursesData, isLoading } = useGetCoursesQuery({
    subjectId: subjectId === "all" ? undefined : subjectId,
    search: values.search || undefined,
    page: values.page,
    limit: PAGE_SIZE,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });
  const courses = coursesData?.items ?? [];
  const total = coursesData?.total ?? 0;

  const [createLearningSubject, { isLoading: creatingSubject }] =
    useCreateLearningSubjectMutation();

  const columns: ColumnDef<CourseSummary, any>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => <SortableHeader column={column} label="Course" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <span className="max-w-[240px] truncate text-xs font-semibold text-foreground">
            {row.original.title}
          </span>
        </div>
      ),
    },
    {
      id: "subject",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Subject
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {row.original.learningSubject.name}
        </span>
      ),
    },
    {
      id: "estimatedHours",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Est. Hours
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {row.original.estimatedHours ? `${row.original.estimatedHours}h` : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold capitalize ${
            statusColors[row.original.status] || ""
          }`}
        >
          {row.original.status.toLowerCase()}
        </span>
      ),
    },
    {
      id: "concepts",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Chapters
        </span>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] font-bold text-muted-foreground">
            {row.original._count.concepts}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      ),
    },
  ];

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
            placeholder="Search courses by title..."
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
      <DataTable
        columns={columns}
        data={courses}
        isLoading={isLoading}
        page={values.page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(next) => setValue("page", next)}
        paginationLabel="course"
        sortBy={values.sortBy}
        sortOrder={values.sortOrder as "asc" | "desc"}
        onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
        onRowClick={(course) => router.push(`/courses/${course.id}`)}
        emptyTitle="No courses found"
        emptyDescription="Try adjusting your search, or author a course to populate the catalog."
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
    </div>
  );
}
