"use client";

import React from "react";

import { MathRenderer } from "@/components/MathRenderer";

import type { QuestionOption } from "../clioApi";

interface MCQWidgetProps {
  options: QuestionOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  locked: boolean;
  isCorrect?: boolean | null;
}

export function MCQWidget({ options, selectedId, onSelect, locked, isCorrect }: MCQWidgetProps) {
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
                ? "border-border bg-card cursor-pointer hover:scale-[1.02] hover:border-violet-500/60 hover:bg-violet-500/5"
                : "",
              isSelected && !locked
                ? "scale-[1.02] border-violet-500 bg-violet-500/10 dark:bg-violet-500/20"
                : "",
              correct
                ? "scale-[1.02] border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20"
                : "",
              wrong
                ? "animate-shake scale-[1.02] border-rose-500 bg-rose-500/10 dark:bg-rose-500/20"
                : "",
              locked && !isSelected ? "cursor-not-allowed opacity-40" : "",
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

            <span className="text-foreground text-sm leading-snug font-medium">
              <MathRenderer text={opt.optionText} />
            </span>

            {/* Result icon overlay */}
            {correct && (
              <span className="animate-bounce-once absolute top-3 right-3 text-lg text-emerald-500">
                ✓
              </span>
            )}
            {wrong && <span className="absolute top-3 right-3 text-lg text-rose-500">✗</span>}
          </button>
        );
      })}
    </div>
  );
}
