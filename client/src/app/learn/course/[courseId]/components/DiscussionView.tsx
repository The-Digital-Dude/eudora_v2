"use client";

import { MessageSquare, Send } from "lucide-react";
import React, { useState } from "react";

import {
  useAddDiscussionPostMutation,
  useGetDiscussionQuery,
  useUpdateModuleItemProgressMutation,
} from "@/features/catalog/catalogApi";
import type { ModuleItem } from "@/features/catalog/catalogApi";

interface DiscussionViewProps {
  item: ModuleItem;
  onCompleted: () => void;
}

export function DiscussionView({ item, onCompleted }: DiscussionViewProps) {
  const { data: thread, isLoading } = useGetDiscussionQuery(item.id);
  const [addPost, { isLoading: isPosting }] = useAddDiscussionPostMutation();
  const [updateProgress] = useUpdateModuleItemProgressMutation();
  const [draft, setDraft] = useState("");

  const handlePost = async () => {
    if (!draft.trim()) return;
    await addPost({ moduleItemId: item.id, body: draft.trim() }).unwrap();
    setDraft("");
    if (!item.isDone) {
      await updateProgress({ id: item.id, completed: true }).unwrap();
      onCompleted();
    }
  };

  if (isLoading || !thread) {
    return <p className="p-8 text-sm text-muted-foreground">Loading discussion...</p>;
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-8">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{item.title}</h2>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{thread.prompt}</p>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {thread.posts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No replies yet — be the first to share your thoughts.
          </p>
        ) : (
          thread.posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <p className="text-xs font-bold text-foreground">
                {post.studentProfile.fullName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{post.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Share your thoughts..."
          className="h-16 flex-1 resize-none rounded-xl border border-border bg-muted/30 p-2.5 text-xs text-foreground focus:outline-none"
        />
        <button
          onClick={handlePost}
          disabled={isPosting || !draft.trim()}
          className="flex h-16 items-center justify-center rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
