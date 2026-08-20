"use client";

import { Plus } from "lucide-react";
import React from "react";

import { AddChildDialog } from "@/components/add-child-dialog";
import type { ChildRollup } from "@/features/parent/parentApi";

/**
 * Which child the whole panel is about.
 *
 * This used to be three large cards in the page body, each repeating the same
 * three statistics. That put the choice *below* the content it governs and gave
 * a household of two children more visual weight than the work those children
 * are doing. As a row of tabs it reads as what it is — one control that
 * re-points everything underneath — and it leaves room for the statistics to be
 * shown once, for the child actually selected.
 */
export function ChildTabs({
  // Not named `children`: these are data, and a prop by that name reading as
  // anything other than React nodes is a trap for the next reader.
  childList,
  activeChildId,
  onSelect,
}: {
  childList: ChildRollup[];
  activeChildId: string;
  onSelect: (studentProfileId: string) => void;
}) {
  return (
    <div className="border-border flex flex-wrap items-center gap-2 border-b pb-3">
      {childList.map((child) => {
        const isActive = child.studentProfileId === activeChildId;
        return (
          <button
            key={child.studentProfileId}
            type="button"
            onClick={() => onSelect(child.studentProfileId)}
            aria-pressed={isActive}
            className={`flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-xs font-semibold transition-all ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {initialsOf(child.fullName)}
            </span>
            <span className="max-w-[14ch] truncate">{child.fullName}</span>
            {/* The one number worth carrying on the tab itself: it is the only
                thing here that is a request for the guardian's attention. */}
            {child.pendingHomeworkCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? "bg-background/20" : "bg-warning/10 text-warning"
                }`}
              >
                {child.pendingHomeworkCount}
              </span>
            )}
          </button>
        );
      })}

      <AddChildDialog
        trigger={
          <button
            type="button"
            className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-3 py-2 text-xs font-semibold transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add child
          </button>
        }
      />
    </div>
  );
}

export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
