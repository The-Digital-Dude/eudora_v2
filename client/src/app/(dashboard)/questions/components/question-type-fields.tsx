"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface QuestionOption {
  id?: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

interface QuestionTypeFieldsProps {
  questionType: string;
  options: QuestionOption[];
  onOptionsChange: (newOptions: QuestionOption[]) => void;
  correctAnswer: string;
  onCorrectAnswerChange: (newAnswer: string) => void;
}

export function QuestionTypeFields({
  questionType,
  options,
  onOptionsChange,
  correctAnswer,
  onCorrectAnswerChange,
}: QuestionTypeFieldsProps) {
  
  if (questionType === "mcq") {
    const handleAddOption = () => {
      const label = String.fromCharCode(65 + options.length); // A, B, C...
      onOptionsChange([...options, { optionLabel: label, optionText: "", isCorrect: false }]);
    };

    const handleUpdateOption = (idx: number, key: keyof QuestionOption, val: any) => {
      const newOptions = options.map((opt, i) => {
        if (i === idx) {
          return { ...opt, [key]: val };
        }
        // If single correct option and we set this to true, set others to false
        if (key === "isCorrect" && val === true) {
          return { ...opt, isCorrect: false };
        }
        return opt;
      });
      
      // Update specific target index after mapping
      if (key === "isCorrect" && val === true) {
        newOptions[idx].isCorrect = true;
      }

      onOptionsChange(newOptions);
    };

    const handleRemoveOption = (idx: number) => {
      const filtered = options.filter((_, i) => i !== idx);
      // Re-label options sequentially
      const relabeled = filtered.map((opt, i) => ({
        ...opt,
        optionLabel: String.fromCharCode(65 + i),
      }));
      onOptionsChange(relabeled);
    };

    return (
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            MCQ Options Choices
          </Label>
          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400"
          >
            <Plus className="h-4 w-4" /> Add Option
          </button>
        </div>

        <div className="space-y-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-3">
              {/* Option Label Indicator */}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs font-bold text-neutral-500 dark:bg-zinc-800 dark:text-zinc-400">
                {opt.optionLabel}
              </span>

              {/* Option Text Input */}
              <Input
                type="text"
                placeholder={`Option ${opt.optionLabel} text...`}
                value={opt.optionText}
                onChange={(e) => handleUpdateOption(idx, "optionText", e.target.value)}
                className="h-10 rounded-xl text-xs flex-1 border-neutral-200 dark:border-zinc-800"
              />

              {/* Is Correct Checkbox */}
              <div className="flex items-center gap-2 border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 rounded-xl px-3 h-10 select-none">
                <Checkbox
                  id={`iscorrect-${idx}`}
                  checked={opt.isCorrect}
                  onCheckedChange={(checked) => handleUpdateOption(idx, "isCorrect", !!checked)}
                  className="rounded-md border-neutral-300 dark:border-zinc-700"
                />
                <label
                  htmlFor={`iscorrect-${idx}`}
                  className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 cursor-pointer"
                >
                  Correct
                </label>
              </div>

              {/* Delete Button */}
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-400 hover:bg-neutral-100 hover:text-rose-500 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (questionType === "numeric" || questionType === "short_answer") {
    return (
      <div className="space-y-1.5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          {questionType === "numeric" ? "Correct Numeric Answer" : "Correct Short-Answer Key"}
        </Label>
        <Input
          type={questionType === "numeric" ? "number" : "text"}
          step="any"
          placeholder={questionType === "numeric" ? "e.g. 42" : "e.g. photosynthesis"}
          value={correctAnswer}
          onChange={(e) => onCorrectAnswerChange(e.target.value)}
          className="h-10 rounded-xl text-xs border-neutral-200 dark:border-zinc-800"
          required
        />
      </div>
    );
  }

  return null;
}
