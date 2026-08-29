"use client";

import * as React from "react";
import { toast } from "sonner";

import type { CourseSummary } from "@/features/catalog/catalogApi";
import { useUpdateCourseMutation } from "@/features/catalog/catalogApi";

import {
  CourseForm,
  type CourseFormValues,
  courseToFormValues,
  toCoursePayload,
} from "./course-form";

/**
 * The course edit surface. Until this existed there was no way to change a
 * course after creation at all — `useUpdateCourseMutation` had been defined
 * and exported for months with nothing importing it, so pricing, grade band
 * and publish state were only ever set by the seed script.
 */
export function CourseSettingsPanel({
  course,
}: {
  /** `_count` is a list-view concern the form never reads. */
  course: Omit<CourseSummary, "_count">;
}) {
  const [updateCourse, { isLoading: isSaving }] = useUpdateCourseMutation();
  const [values, setValues] = React.useState<CourseFormValues>(() =>
    courseToFormValues(course),
  );
  const [error, setError] = React.useState("");

  // Re-sync when the fetched course changes underneath the form — a refetch
  // after saving, or navigating between courses without remounting.
  React.useEffect(() => {
    setValues(courseToFormValues(course));
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Subject and slug are locked on edit, so they are not part of the update.
    const { learningSubjectId: _subject, slug: _slug, ...body } = toCoursePayload(values);

    try {
      await updateCourse({ id: course.id, body }).unwrap();
      toast.success("Course updated.");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to update course.");
    }
  };

  return (
    <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm">
      <CourseForm
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        onCancel={() => setValues(courseToFormValues(course))}
        isSaving={isSaving}
        submitLabel="Save changes"
        error={error}
        isEdit
      />
    </div>
  );
}
