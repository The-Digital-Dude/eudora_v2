"use client";

import React from "react";
import { GraduationCap } from "lucide-react";
import type { ChildRollup } from "@/features/parent/parentApi";

interface ChildSelectorProps {
  childrenList: ChildRollup[];
  selectedChildId: string | null;
  onSelectChild: (id: string) => void;
}

export function ChildSelector({
  childrenList,
  selectedChildId,
  onSelectChild,
}: ChildSelectorProps) {
  if (childrenList.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 bg-card/40/40 border border-border/50 backdrop-blur-md px-4 py-2.5 rounded-2xl w-fit">
      <GraduationCap className="h-4. w-4 text-primary" />
      <span className="text-xs font-semibold text-muted-foreground">Select Child:</span>
      <select
        value={selectedChildId || ""}
        onChange={(e) => onSelectChild(e.target.value)}
        className="bg-transparent text-xs font-bold text-foreground focus:outline-none border-none cursor-pointer pr-4"
      >
        {childrenList.map((child) => (
          <option key={child.studentProfileId} value={child.studentProfileId} className="dark:bg-muted">
            {child.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}
