"use client";

import { CheckCircle2 } from "lucide-react";
import React from "react";

import { MathRenderer } from "@/components/MathRenderer";
import { useUpdateModuleItemProgressMutation } from "@/features/catalog/catalogApi";
import type { ModuleItem } from "@/features/catalog/catalogApi";

interface ReadingViewProps {
  item: ModuleItem;
  onCompleted: () => void;
}

export function ReadingView({ item, onCompleted }: ReadingViewProps) {
  const [updateProgress, { isLoading }] = useUpdateModuleItemProgressMutation();

  const handleMarkComplete = async () => {
    await updateProgress({ id: item.id, completed: true }).unwrap();
    onCompleted();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h2 className="text-xl font-bold text-foreground">{item.title}</h2>
      <div className="prose dark:prose-invert text-sm leading-relaxed text-foreground/90">
        <MathRenderer text={item.readingContent || "No content yet."} />
      </div>

      <div className="border-t border-border pt-6">
        {item.isDone ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-success">
            <CheckCircle2 className="h-4 w-4" /> Marked as read
          </span>
        ) : (
          <button
            onClick={handleMarkComplete}
            disabled={isLoading}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? "Saving..." : "Mark as complete"}
          </button>
        )}
      </div>
    </div>
  );
}
