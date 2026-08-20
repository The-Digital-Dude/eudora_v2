"use client";

import { BookOpen, Loader2, Lock, Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetCourseDetailQuery } from "@/features/catalog/catalogApi";

/**
 * Syllabus preview for a course a guardian is considering.
 *
 * Reuses the authenticated `/catalog/courses/:id` detail rather than linking
 * out to the public `/explore/courses/[slug]` page: that one carries the
 * marketing navbar and footer and its calls to action push to /register, which
 * makes no sense for someone already signed in. This endpoint also returns
 * `isEntitled` and per-item `isContentLocked`, so the preview can show the
 * real shape of the course while being honest that the content itself is
 * locked until purchase.
 */
export function CoursePreviewDialog({
  courseId,
  onClose,
  onAdd,
}: {
  courseId: string | null;
  onClose: () => void;
  onAdd?: (courseId: string) => void;
}) {
  const { data: course, isFetching } = useGetCourseDetailQuery(courseId as string, {
    skip: !courseId,
  });

  return (
    <Dialog open={!!courseId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {isFetching || !course ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-base font-bold">
                {course.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {course.learningSubject?.name}
                {course.estimatedHours ? ` · ${course.estimatedHours}h` : ""}
                {course.concepts?.length ? ` · ${course.concepts.length} chapters` : ""}
              </DialogDescription>
            </DialogHeader>

            {course.description && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {course.description}
              </p>
            )}

            {!course.isEntitled && (
              <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  You can see what this course covers. Lessons unlock once it&apos;s
                  purchased.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                What&apos;s covered
              </p>
              {course.concepts?.length ? (
                <ol className="space-y-1.5">
                  {course.concepts.map((concept, index) => (
                    <li
                      key={concept.id}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted font-mono text-[9px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {concept.name}
                        </p>
                        {concept.lessons?.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {concept.lessons.length}{" "}
                            {concept.lessons.length === 1 ? "lesson" : "lessons"}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  This course doesn&apos;t have any chapters published yet.
                </p>
              )}
            </div>

            {onAdd && (
              <Button
                onClick={() => {
                  onAdd(course.id);
                  onClose();
                }}
                className="mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to learning plan
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
