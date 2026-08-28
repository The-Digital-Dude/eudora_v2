"use client";

import { CheckCircle2 } from "lucide-react";
import React from "react";

import { StoryReader } from "@/components/story/story-reader";
import type { ModuleItem } from "@/features/catalog/catalogApi";
import { useUpdateModuleItemProgressMutation } from "@/features/catalog/catalogApi";
import {
  useAskStoryMutation,
  useGetStoryByModuleItemQuery,
} from "@/features/stories/storiesApi";
import type { AskPayload } from "@/features/stories/types";

interface StoryViewProps {
  item: ModuleItem;
  onCompleted: () => void;
}

/**
 * A story inside a course the family has paid for.
 *
 * The same reader the public demo uses, pointed at the authenticated routes
 * instead. Two differences, both deliberate: the media carries credentials,
 * because these routes check entitlement on every request; and there is no
 * question cap, because the cost is already covered by the thing they bought —
 * capping lives on the demo, which anyone can reach.
 */
export function StoryView({ item, onCompleted }: StoryViewProps) {
  const { data: story, isLoading, error } = useGetStoryByModuleItemQuery(item.id);
  const [askStory] = useAskStoryMutation();
  const [updateProgress, { isLoading: saving }] =
    useUpdateModuleItemProgressMutation();

  const ask = React.useCallback(
    async (payload: AskPayload) => {
      if (!story) throw new Error("The story is still loading");
      return askStory({ storyId: story.id, ...payload }).unwrap();
    },
    [askStory, story],
  );

  const handleMarkComplete = async () => {
    await updateProgress({ id: item.id, completed: true }).unwrap();
    onCompleted();
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="animate-pulse rounded-lg border p-8 text-center text-muted-foreground">
          Opening the book…
        </p>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="p-8">
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          This story could not be opened right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <StoryReader story={story} onAsk={ask} withCredentials />

      <div className="border-t border-border pt-6">
        {item.isDone ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-success">
            <CheckCircle2 className="h-4 w-4" /> Finished
          </span>
        ) : (
          <button
            onClick={handleMarkComplete}
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Saving…" : "I finished this story"}
          </button>
        )}
      </div>
    </div>
  );
}
