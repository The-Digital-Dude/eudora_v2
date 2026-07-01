"use client";

import React, { useState } from "react";
import { Plus, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGetQuestionsQuery, useArchiveQuestionMutation, Question } from "@/features/assessments/questionsApi";
import { QuestionFilterBar } from "./components/question-filter-bar";
import { QuestionTable } from "./components/question-table";
import { QuestionEditorDialog } from "./components/question-editor-dialog";

export default function QuestionsPage() {
  const [filters, setFilters] = useState({
    search: "",
    subjectId: "",
    levelId: "",
    questionType: "",
    difficulty: "",
    status: "",
  });

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, isFetching } = useGetQuestionsQuery({
    ...filters,
    page,
    pageSize,
  });

  const [archiveQuestion] = useArchiveQuestionMutation();

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to page 1 on search filter change
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      subjectId: "",
      levelId: "",
      questionType: "",
      difficulty: "",
      status: "",
    });
    setPage(1);
  };

  const handleCreateClick = () => {
    setSelectedQuestionId(null);
    setSelectedQuestion(null);
    setEditorOpen(true);
  };

  const handleEditClick = (q: Question) => {
    setSelectedQuestionId(q.id);
    setSelectedQuestion(q);
    setEditorOpen(true);
  };

  const handleArchiveClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to archive this question? It will not be shown in active selections.")) return;

    try {
      await archiveQuestion(id).unwrap();
      toast.success("Question archived successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to archive question.");
    }
  };

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Question Bank
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Build and manage reusable standard or interactive active learning questions.
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary transition-all sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Create Question
        </button>
      </div>

      {/* Filter Bar */}
      <QuestionFilterBar
        filters={filters}
        onFilterChange={handleFilterChange as any}
        onReset={handleResetFilters}
      />

      {/* Main Table view */}
      {isLoading ? (
        <div className="flex h-60 w-full items-center justify-center bg-card border border-border rounded-3xl/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Loading question bank...</span>
          </div>
        </div>
      ) : (
        <div className={isFetching ? "opacity-60" : ""}>
          <QuestionTable
            questions={data?.items || []}
            onEdit={handleEditClick}
            onArchive={handleArchiveClick}
          />

          {/* Pagination Controls */}
          {total > pageSize && (
            <div className="mt-4 flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground font-semibold">
                Showing {Math.min((page - 1) * pageSize + 1, total)} to{" "}
                {Math.min(page * pageSize, total)} of {total} questions
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-muted/50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-foreground px-2 select-none">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-muted/50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal Dialog */}
      <QuestionEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        questionId={selectedQuestionId}
        initialQuestion={selectedQuestion}
      />
    </div>
  );
}
