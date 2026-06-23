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
    <div className="flex items-center gap-2 bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md px-4 py-2.5 rounded-2xl w-fit">
      <GraduationCap className="h-4. w-4 text-indigo-500" />
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Select Child:</span>
      <select
        value={selectedChildId || ""}
        onChange={(e) => onSelectChild(e.target.value)}
        className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none border-none cursor-pointer pr-4"
      >
        {childrenList.map((child) => (
          <option key={child.studentProfileId} value={child.studentProfileId} className="dark:bg-zinc-900">
            {child.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}
