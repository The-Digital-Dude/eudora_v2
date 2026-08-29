"use client";

import { ArrowRight, Loader2, Lock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import type { ModuleItem, ModuleItemKind } from "@/features/catalog/catalogApi";
import { useGetCourseDetailQuery } from "@/features/catalog/catalogApi";

import { AssessmentItemView } from "./components/AssessmentItemView";
import { CourseOutlineSidebar } from "./components/CourseOutlineSidebar";
import { DiscussionView } from "./components/DiscussionView";
import { HomeworkItemView } from "./components/HomeworkItemView";
import { LiveClassView } from "./components/LiveClassView";
import { ReadingView } from "./components/ReadingView";
import { StoryView } from "./components/StoryView";

/**
 * One renderer per kind, as a Record over the union rather than a chain of
 * &&s. The chain had no else: a kind nobody had written a view for rendered
 * silently nothing, so a child opening it saw an empty pane and no error. This
 * shape makes the compiler refuse to build until every kind is handled.
 */
const itemRenderers: Record<
  ModuleItemKind,
  (item: ModuleItem) => React.ReactNode
> = {
  VIDEO: (item) => <VideoLectureView item={item} onCompleted={() => {}} />,
  READING: (item) => <ReadingView item={item} onCompleted={() => {}} />,
  DISCUSSION: (item) => <DiscussionView item={item} onCompleted={() => {}} />,
  ASSESSMENT: (item) => <AssessmentItemView item={item} />,
  HOMEWORK: (item) => <HomeworkItemView item={item} />,
  LIVE_CLASS: (item) => <LiveClassView item={item} />,
  STORY: (item) => <StoryView item={item} onCompleted={() => {}} />,
};

function renderItem(item: ModuleItem) {
  const render = itemRenderers[item.kind];
  // Reachable only if the API sends a kind this build does not know about,
  // which happens when the client is older than the API. Saying so beats a
  // blank pane.
  if (!render) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-bold text-foreground">{item.title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          This kind of lesson needs a newer version of the app. Try refreshing.
        </p>
      </div>
    );
  }
  return render(item);
}
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

  // Default to the first item the viewer can actually open. Falling back to
  // item[0] would land an unenrolled visitor on a locked item and render an
  // empty player, which reads as broken rather than as gated.
  const selectedItem: ModuleItem | undefined =
    flattenedItems.find((i) => i.id === selectedItemId) ??
    flattenedItems.find((i) => !i.isContentLocked) ??
    flattenedItems[0];

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
        {!course.isEntitled && (
          <div className="flex flex-wrap items-center gap-2 border-b border-warning/20 bg-warning/10 px-6 py-3">
            <Lock className="h-3.5 w-3.5 shrink-0 text-warning" />
            <p className="text-xs font-semibold text-foreground">
              You&apos;re previewing this course.
            </p>
            <p className="text-xs text-muted-foreground">
              Items marked FREE are open. The rest unlock when you enrol.
            </p>
          </div>
        )}
        {!selectedItem ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              This course doesn&apos;t have any items yet.
            </p>
          </div>
        ) : selectedItem.isContentLocked ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-bold text-foreground">
              {selectedItem.title}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              This content is part of a paid programme. Enrol to unlock every
              lesson, practice set and assessment in this course.
            </p>
          </div>
        ) : (
          <>
            {renderItem(selectedItem)}

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
