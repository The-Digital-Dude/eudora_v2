"use client";

import { Archive, Edit2, HelpCircle } from "lucide-react";
import React from "react";

import type { Question } from "@/features/assessments/questionsApi";

interface QuestionTableProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onArchive: (id: string) => void;
}

export function QuestionTable({ questions, onEdit, onArchive }: QuestionTableProps) {
  const difficultyColors: Record<string, string> = {
    easy: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/10 text-warning border-warning/20/30",
    hard: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
    extension: "bg-primary/10 text-primary border-primary/10",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    archived: "bg-destructive/10 text-destructive",
  };

  const formatText = (txt: string) => {
    return txt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card py-16 text-center shadow-sm">
        <HelpCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-bold text-foreground">No questions found</h3>
        <p className="max-w-xs text-xs text-muted-foreground mt-1">
          Try expanding your search query or creating a new question to seed the bank.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              <th className="px-6 py-4">Prompt Stem</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Grade</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Difficulty</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {questions.map((q) => {
              const cleanPrompt = q.prompt
                ? q.prompt.replace(/\$\$[\s\S]+?\$\$|\$[\s\S]+?\$/g, "[Math]")
                : "";
              const truncatedPrompt =
                cleanPrompt.length > 70 ? `${cleanPrompt.slice(0, 70)}...` : cleanPrompt;

              return (
                <tr key={q.id} className="text-xs transition-colors hover:bg-muted/50/30">
                  {/* Prompt */}
                  <td className="px-6 py-4 font-semibold text-foreground">
                    <div className="flex flex-col gap-0.5 max-w-[280px]">
                      <span className="truncate">{truncatedPrompt || q.prompt}</span>
                      {q.widgetType && (
                        <span className="text-[10px] font-bold text-primary">
                          ⚙ Interactive {formatText(q.widgetType)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="px-6 py-4 text-muted-foreground font-semibold">
                    {q.subject?.name || "Unassigned"}
                  </td>

                  {/* Level */}
                  <td className="px-6 py-4 text-muted-foreground font-semibold">
                    {q.level?.name || "Unassigned"}
                  </td>

                  {/* Question Type */}
                  <td className="px-6 py-4 font-medium text-muted-foreground capitalize">
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
                        className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        title="Edit question"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      
                      {q.status !== "archived" && (
                        <button
                          onClick={() => onArchive(q.id)}
                          className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive"
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
