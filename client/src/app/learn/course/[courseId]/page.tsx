"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { useGetCourseDetailQuery } from "@/features/catalog/catalogApi";
import type { ModuleItem } from "@/features/catalog/catalogApi";

import { AssessmentItemView } from "./components/AssessmentItemView";
import { CourseOutlineSidebar } from "./components/CourseOutlineSidebar";
import { DiscussionView } from "./components/DiscussionView";
import { ReadingView } from "./components/ReadingView";
import { VideoLectureView } from "./components/VideoLectureView";

export default function CourseOutlinePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const { data: course, isLoading } = useGetCourseDetailQuery(courseId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Flattened, sortOrder-ordered list of module items across every concept —
  // one single sequence, matching Coursera's own single-sequence-per-module
  // behavior (no type-aware interleaving needed).
  const flattenedItems = useMemo(() => {
    if (!course) return [];
    return course.concepts.flatMap((c) => c.items);
  }, [course]);

  const selectedItem: ModuleItem | undefined =
    flattenedItems.find((i) => i.id === selectedItemId) ?? flattenedItems[0];

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Course not found.</p>
      </div>
    );
  }

  const currentIndex = selectedItem
    ? flattenedItems.findIndex((i) => i.id === selectedItem.id)
    : -1;
  const nextItem =
    currentIndex >= 0 ? flattenedItems[currentIndex + 1] : undefined;

  const handleGoToNext = () => {
    if (nextItem) {
      setSelectedItemId(nextItem.id);
    } else {
      router.push("/learning");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <CourseOutlineSidebar
        course={course}
        selectedItemId={selectedItem?.id ?? null}
        onSelectItem={(item) => setSelectedItemId(item.id)}
      />

      <main className="relative flex-1 overflow-y-auto">
        {!selectedItem ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              This course doesn&apos;t have any items yet.
            </p>
          </div>
        ) : (
          <>
            {selectedItem.kind === "VIDEO" && (
              <VideoLectureView item={selectedItem} onCompleted={() => {}} />
            )}
            {selectedItem.kind === "READING" && (
              <ReadingView item={selectedItem} onCompleted={() => {}} />
            )}
            {selectedItem.kind === "DISCUSSION" && (
              <DiscussionView item={selectedItem} onCompleted={() => {}} />
            )}
            {selectedItem.kind === "ASSESSMENT" && (
              <AssessmentItemView item={selectedItem} />
            )}

            <button
              onClick={handleGoToNext}
              className="fixed bottom-6 right-6 flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90"
            >
              {nextItem ? "Go to next item" : "Back to learning hub"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </main>
    </div>
  );
}
