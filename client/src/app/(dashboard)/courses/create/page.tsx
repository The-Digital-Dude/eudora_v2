"use client";

import { BookPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import {
  useCreateCourseMutation,
  useGetLearningSubjectsQuery,
} from "@/features/catalog/catalogApi";

import {
  CourseForm,
  type CourseFormValues,
  EMPTY_COURSE,
  toCoursePayload,
} from "../components/course-form";

export default function CreateCoursePage() {
  const router = useRouter();
  const { data: subjects } = useGetLearningSubjectsQuery();
  const [createCourse, { isLoading: creatingCourse }] = useCreateCourseMutation();

  const [values, setValues] = React.useState<CourseFormValues>(EMPTY_COURSE);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setValues((prev) =>
      prev.learningSubjectId
        ? prev
        : { ...prev, learningSubjectId: subjects?.[0]?.id ?? "" },
    );
  }, [subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title || !values.learningSubjectId) {
      setError("Subject and title are required.");
      return;
    }
    setError("");

    try {
      const course = await createCourse(toCoursePayload(values)).unwrap();
      toast.success("Course created.");
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

      <Card className="max-w-2xl rounded-3xl border border-border bg-card p-6">
        <CourseForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/courses")}
          isSaving={creatingCourse}
          submitLabel="Create Course"
          error={error}
        />
      </Card>
    </div>
  );
}
