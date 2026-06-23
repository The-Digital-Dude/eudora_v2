"use client";

import React from "react";
import { Edit2, Archive, HelpCircle } from "lucide-react";
import type { Question } from "@/features/assessments/questionsApi";

interface QuestionTableProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onArchive: (id: string) => void;
}

export function QuestionTable({ questions, onEdit, onArchive }: QuestionTableProps) {
  const difficultyColors: Record<string, string> = {
    easy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
    medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
    hard: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
    extension: "bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 border-violet-100 dark:border-violet-900/30",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400",
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    archived: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  const formatText = (txt: string) => {
    return txt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-200 bg-white py-16 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <HelpCircle className="h-10 w-10 text-neutral-300 mb-3" />
        <h3 className="text-sm font-bold text-neutral-800 dark:text-zinc-200">No questions found</h3>
        <p className="max-w-xs text-xs text-neutral-400 mt-1">
          Try expanding your search query or creating a new question to seed the bank.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-150 bg-neutral-50/50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:border-zinc-800 dark:bg-zinc-900/80">
              <th className="px-6 py-4">Prompt Stem</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Grade</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Difficulty</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150 dark:divide-zinc-800">
            {questions.map((q) => {
              const cleanPrompt = q.prompt
                ? q.prompt.replace(/\$\$[\s\S]+?\$\$|\$[\s\S]+?\$/g, "[Math]")
                : "";
              const truncatedPrompt =
                cleanPrompt.length > 70 ? `${cleanPrompt.slice(0, 70)}...` : cleanPrompt;

              return (
                <tr key={q.id} className="text-xs transition-colors hover:bg-neutral-50/50 dark:hover:bg-zinc-900/30">
                  {/* Prompt */}
                  <td className="px-6 py-4 font-semibold text-neutral-800 dark:text-zinc-200">
                    <div className="flex flex-col gap-0.5 max-w-[280px]">
                      <span className="truncate">{truncatedPrompt || q.prompt}</span>
                      {q.widgetType && (
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                          ⚙ Interactive {formatText(q.widgetType)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="px-6 py-4 text-neutral-500 font-semibold dark:text-zinc-400">
                    {q.subject?.name || "Unassigned"}
                  </td>

                  {/* Level */}
                  <td className="px-6 py-4 text-neutral-500 font-semibold dark:text-zinc-400">
                    {q.level?.name || "Unassigned"}
                  </td>

                  {/* Question Type */}
                  <td className="px-6 py-4 font-medium text-neutral-500 dark:text-zinc-400 capitalize">
                    {formatText(q.questionType)}
                  </td>

                  {/* Difficulty */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${difficultyColors[q.difficulty] || ""}`}>
                      {q.difficulty}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusColors[q.status] || ""}`}>
                      {q.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(q)}
                        className="rounded-xl border border-neutral-200 bg-white p-2 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
                        title="Edit question"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      
                      {q.status !== "archived" && (
                        <button
                          onClick={() => onArchive(q.id)}
                          className="rounded-xl border border-neutral-200 bg-white p-2 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-rose-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
                          title="Archive question"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
