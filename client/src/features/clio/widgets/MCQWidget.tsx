"use client";

import React from "react";
import type { QuestionOption } from "../clioApi";
import { MathRenderer } from "@/components/MathRenderer";

interface MCQWidgetProps {
  options: QuestionOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  locked: boolean;
  isCorrect?: boolean | null;
}

export function MCQWidget({
  options,
  selectedId,
  onSelect,
  locked,
  isCorrect,
}: MCQWidgetProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        const showResult = locked && isSelected;
        const correct = showResult && isCorrect === true;
        const wrong = showResult && isCorrect === false;

        return (
          <button
            key={opt.id}
            onClick={() => !locked && onSelect(opt.id)}
            disabled={locked}
            className={[
              "group relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              !isSelected && !locked
                ? "border-border bg-card hover:border-violet-500/60 hover:bg-violet-500/5 hover:scale-[1.02] cursor-pointer"
                : "",
              isSelected && !locked
                ? "border-violet-500 bg-violet-500/10 dark:bg-violet-500/20 scale-[1.02]"
                : "",
              correct
                ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 scale-[1.02]"
                : "",
              wrong
                ? "border-rose-500 bg-rose-500/10 dark:bg-rose-500/20 scale-[1.02] animate-shake"
                : "",
              locked && !isSelected ? "opacity-40 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Option label badge */}
            <span
              className={[
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-colors",
                correct
                  ? "bg-emerald-500 text-white"
                  : wrong
                  ? "bg-rose-500 text-white"
                  : isSelected
                  ? "bg-violet-500 text-white"
                  : "bg-muted text-muted-foreground group-hover:bg-violet-500/20 group-hover:text-violet-600 dark:group-hover:text-violet-400",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {opt.optionLabel}
            </span>

            <span className="text-sm font-medium leading-snug text-foreground">
              <MathRenderer text={opt.optionText} />
            </span>

            {/* Result icon overlay */}
            {correct && (
              <span className="absolute right-3 top-3 text-emerald-500 text-lg animate-bounce-once">
                ✓
              </span>
            )}
            {wrong && (
              <span className="absolute right-3 top-3 text-rose-500 text-lg">
                ✗
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
