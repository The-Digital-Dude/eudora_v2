"use client";

import { BookPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCourseMutation, useGetLearningSubjectsQuery } from "@/features/catalog/catalogApi";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CreateCoursePage() {
  const router = useRouter();
  const { data: subjects } = useGetLearningSubjectsQuery();
  const [createCourse, { isLoading: creatingCourse }] = useCreateCourseMutation();

  const [subjectId, setSubjectId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [estimatedHours, setEstimatedHours] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setSubjectId((prev) => prev || subjects?.[0]?.id || "");
  }, [subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId) {
      setError("Subject and title are required.");
      return;
    }
    setError("");

    try {
      const course = await createCourse({
        learningSubjectId: subjectId,
        title,
        slug: slugify(title),
        description: description || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      }).unwrap();
      toast.success("Course created!");
      router.push(`/courses/${course.id}`);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to create course.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Courses
        </Link>
        <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
          <BookPlus className="h-6 w-6 text-primary" />
          Create Course
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          A new course within a subject. Chapters can be added once it exists.
        </p>
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Subject
            </Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="10"
              className="h-10 border-border text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/courses")}
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
          </div>
        </form>
      </Card>
    </div>
  );
}
