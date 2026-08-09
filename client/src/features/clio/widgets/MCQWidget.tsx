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
        // The answer reveal: locked, the student missed it, and this is the
        // option that was actually correct (which they didn't pick).
        const revealCorrect = locked && isCorrect === false && !isSelected && opt.isCorrect;

        return (
          <button
            key={opt.id}
            onClick={() => !locked && onSelect(opt.id)}
            disabled={locked}
            className={[
              "group relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              !isSelected && !locked
                ? "border-border bg-card cursor-pointer hover:scale-[1.02] hover:border-primary/60 hover:bg-primary/5"
                : "",
              isSelected && !locked
                ? "scale-[1.02] border-primary bg-primary/10 dark:bg-primary/20"
                : "",
              correct
                ? "scale-[1.02] border-success bg-success/10"
                : "",
              wrong
                ? "animate-shake scale-[1.02] border-destructive bg-destructive/10"
                : "",
              revealCorrect ? "border-success bg-success/5" : "",
              locked && !isSelected && !revealCorrect ? "cursor-not-allowed opacity-40" : "",
              locked && revealCorrect ? "cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Option label badge */}
            <span
              className={[
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-colors",
                correct
                  ? "bg-success text-success-foreground"
                  : wrong
                    ? "bg-destructive text-destructive-foreground"
                    : revealCorrect
                      ? "bg-success/20 text-success"
                      : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary dark:group-hover:text-primary",
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
              <span className="animate-bounce-once absolute top-3 right-3 text-lg text-success">
                ✓
              </span>
            )}
            {wrong && <span className="absolute top-3 right-3 text-lg text-destructive">✗</span>}
            {revealCorrect && (
              <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide text-success">
                Correct answer
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
