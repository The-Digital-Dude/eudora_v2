"use client";

import React, { useState, useEffect } from "react";
import { MathRenderer } from "@/components/MathRenderer";
import { WidgetSelector } from "@/features/clio/widgets/WidgetSelector";
import type { Question } from "@/features/assessments/questionsApi";

interface QuestionPreviewProps {
  question: Partial<Question>;
}

export function QuestionPreview({ question }: QuestionPreviewProps) {
  const [widgetState, setWidgetState] = useState<any>(null);

  // Reset widget state when type or config changes
  useEffect(() => {
    setWidgetState(null);
  }, [question.widgetType, question.widgetConfig]);

  if (!question) return null;

  const difficultyColors: Record<string, string> = {
    easy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30",
    medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30",
    hard: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200 dark:border-orange-900/30",
    extension: "bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 border-violet-200 dark:border-violet-900/30",
  };

  const formattedType = (question.questionType ?? "written")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header Info Badges */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {formattedType}
        </span>
        {question.difficulty && (
          <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${difficultyColors[question.difficulty] || ""}`}>
            {question.difficulty}
          </span>
        )}
      </div>

      {/* Math Prompt Render */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-relaxed text-neutral-800 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-200">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
          Prompt
        </h4>
        <MathRenderer text={question.prompt || "No prompt entered."} className="font-medium" />
      </div>

      {/* Widget Render */}
      {question.widgetType && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pl-1">
            Interactive Playable Widget
          </h4>
          <WidgetSelector
            question={{
              id: question.id || "preview-id",
              prompt: question.prompt || "",
              questionType: question.questionType || "mcq",
              widgetType: question.widgetType,
              widgetConfig: question.widgetConfig || null,
              explanation: question.explanation || null,
              hints: question.hints || [],
              correctAnswer: question.correctAnswer || null,
              options: (question.options || []).map((o, idx) => ({
                id: o.id || `temp-${idx}`,
                optionLabel: o.optionLabel,
                optionText: o.optionText,
                isCorrect: o.isCorrect,
              })),
            }}
            currentState={widgetState}
            onStateChange={setWidgetState}
            locked={false}
          />
        </div>
      )}

      {/* Options preview for MCQ */}
      {question.questionType === "mcq" && !question.widgetType && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Options
          </h4>
          <div className="grid gap-2">
            {(question.options || []).map((opt, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between rounded-xl border p-3 text-xs font-semibold transition-all ${
                  opt.isCorrect
                    ? "border-emerald-200 bg-emerald-50/10 text-emerald-800 dark:border-emerald-800/35 dark:text-emerald-400"
                    : "border-neutral-200 bg-white text-neutral-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${
                    opt.isCorrect
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-100 text-neutral-500 dark:bg-zinc-800"
                  }`}>
                    {opt.optionLabel || String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt.optionText}</span>
                </div>
                {opt.isCorrect && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
                    Correct Option
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer Key */}
      {question.correctAnswer && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900/30">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Correct Answer Key
          </h4>
          <span className="font-mono text-xs text-neutral-800 dark:text-neutral-200 font-bold">
            {question.correctAnswer}
          </span>
        </div>
      )}

      {/* Hints List */}
      {question.hints && question.hints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Hints ({question.hints.length})
          </h4>
          <ul className="list-inside list-decimal space-y-1.5 text-xs text-neutral-600 dark:text-zinc-400">
            {question.hints.map((hint, idx) => (
              <li key={idx} className="font-medium">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explanation Render */}
      {question.explanation && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900/30">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Explanation
          </h4>
          <MathRenderer text={question.explanation} className="text-xs text-neutral-600 dark:text-zinc-400 font-medium" />
        </div>
      )}
    </div>
  );
}
