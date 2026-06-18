"use client";

import React from "react";
import type { QuestionOption } from "../clioApi";

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
                ? "border-white/10 bg-white/5 hover:border-violet-400/60 hover:bg-violet-500/10 hover:scale-[1.02] cursor-pointer"
                : "",
              isSelected && !locked
                ? "border-violet-400 bg-violet-500/15 scale-[1.02]"
                : "",
              correct
                ? "border-emerald-400 bg-emerald-500/15 scale-[1.02]"
                : "",
              wrong
                ? "border-rose-400 bg-rose-500/15 scale-[1.02] animate-shake"
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
                  ? "bg-emerald-400 text-white"
                  : wrong
                  ? "bg-rose-400 text-white"
                  : isSelected
                  ? "bg-violet-400 text-white"
                  : "bg-white/10 text-white/60 group-hover:bg-violet-400/30 group-hover:text-white",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {opt.optionLabel}
            </span>

            <span className="text-sm font-medium leading-snug text-white/90">
              {opt.optionText}
            </span>

            {/* Result icon overlay */}
            {correct && (
              <span className="absolute right-3 top-3 text-emerald-400 text-lg animate-bounce-once">
                ✓
              </span>
            )}
            {wrong && (
              <span className="absolute right-3 top-3 text-rose-400 text-lg">
                ✗
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
