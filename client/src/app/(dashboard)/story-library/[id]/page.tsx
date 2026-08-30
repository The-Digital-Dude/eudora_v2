"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

import { StoryReader } from "@/components/story/story-reader";
import {
  useAskStoryMutation,
  useGetLibraryStoryQuery,
} from "@/features/stories/storiesApi";
import type { AskPayload } from "@/features/stories/types";

/**
 * Reading a library story.
 *
 * The same reader the course player and the public demo use. Credentials are on
 * because the media routes check the read gate on every request; there is no
 * question cap, which is the demo's concern — a signed-in child is known, so
 * their questions are attributable rather than anonymous.
 *
 * No progress is recorded. A library story fills no curriculum slot, so there
 * is no ModuleItem to mark done and nothing that would consume it.
 */
export default function LibraryStoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: story, isLoading, error } = useGetLibraryStoryQuery(id);
  const [askStory] = useAskStoryMutation();

  const ask = React.useCallback(
    async (payload: AskPayload) => {
      if (!story) throw new Error("The story is still loading");
      return askStory({ storyId: story.id, ...payload }).unwrap();
    },
    [askStory, story],
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/story-library"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the Story Library
      </Link>

      {isLoading ? (
        <p className="animate-pulse rounded-2xl border border-border p-12 text-center text-sm text-muted-foreground">
          Opening the book…
        </p>
      ) : error || !story ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-foreground/80 text-sm font-bold">
            This story could not be opened
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            It may have been unpublished since you last saw it.
          </p>
        </div>
      ) : (
        <StoryReader story={story} onAsk={ask} withCredentials />
      )}
    </div>
  );
}
