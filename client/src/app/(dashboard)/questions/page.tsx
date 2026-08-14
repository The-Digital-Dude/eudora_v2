"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit2, HelpCircle, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { DataTable, SortableHeader } from "@/components/data-table";
import { type Question, useArchiveQuestionMutation, useGetQuestionsQuery } from "@/features/assessments/questionsApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

import { QuestionFilterBar } from "./components/question-filter-bar";

const PAGE_SIZE = 15;

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

const formatText = (txt: string) => txt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function QuestionsPage() {
  const { values, setValue, setValues, reset } = useListQueryState(
    {
      search: "",
      subjectId: "",
      levelId: "",
      questionType: "",
      difficulty: "",
      status: "",
      page: 1,
      sortBy: "",
      sortOrder: "asc",
    },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  const { data, isLoading } = useGetQuestionsQuery({
    search: values.search || undefined,
    subjectId: values.subjectId || undefined,
    levelId: values.levelId || undefined,
    questionType: values.questionType || undefined,
    difficulty: values.difficulty || undefined,
    status: values.status || undefined,
    page: values.page,
    pageSize: PAGE_SIZE,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });

  const [archiveQuestion] = useArchiveQuestionMutation();

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

  const questions = data?.items || [];
  const total = data?.total ?? 0;

  const columns: ColumnDef<Question, any>[] = [
    {
      accessorKey: "prompt",
      header: ({ column }) => <SortableHeader column={column} label="Prompt Stem" />,
      cell: ({ row }) => {
        const q = row.original;
        const cleanPrompt = q.prompt ? q.prompt.replace(/\$\$[\s\S]+?\$\$|\$[\s\S]+?\$/g, "[Math]") : "";
        const truncatedPrompt = cleanPrompt.length > 70 ? `${cleanPrompt.slice(0, 70)}...` : cleanPrompt;
        return (
          <div className="flex max-w-[280px] flex-col gap-0.5">
            <span className="truncate text-xs font-semibold text-foreground">
              {truncatedPrompt || q.prompt}
            </span>
            {q.widgetType && (
              <span className="text-[10px] font-bold text-primary">
                ⚙ Interactive {formatText(q.widgetType)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "subject",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Subject
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {row.original.subject?.name || "Unassigned"}
        </span>
      ),
    },
    {
      id: "level",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Grade
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {row.original.level?.name || "Unassigned"}
        </span>
      ),
    },
    {
      accessorKey: "questionType",
      header: ({ column }) => <SortableHeader column={column} label="Type" />,
      cell: ({ row }) => (
        <span className="text-xs font-medium capitalize text-muted-foreground">
          {formatText(row.original.questionType)}
        </span>
      ),
    },
    {
      accessorKey: "difficulty",
      header: ({ column }) => <SortableHeader column={column} label="Difficulty" />,
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            difficultyColors[row.original.difficulty] || ""
          }`}
        >
          {row.original.difficulty}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold capitalize ${
            statusColors[row.original.status] || ""
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Actions
        </span>
      ),
      cell: ({ row }) => {
        const q = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/questions/${q.id}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Edit question"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Link>
            {q.status !== "archived" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveClick(q.id);
                }}
                className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive"
                title="Archive question"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

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
        <Link
          href="/questions/create"
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary transition-all sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Create Question
        </Link>
      </div>

      {/* Filter Bar */}
      <QuestionFilterBar
        filters={{
          search: searchDraft,
          subjectId: values.subjectId,
          levelId: values.levelId,
          questionType: values.questionType,
          difficulty: values.difficulty,
          status: values.status,
        }}
        onFilterChange={(key, value) => {
          if (key === "search") {
            setSearchDraft(value);
          } else {
            setValue(key, value);
          }
        }}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        data={questions}
        isLoading={isLoading}
        page={values.page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(next) => setValue("page", next)}
        paginationLabel="question"
        sortBy={values.sortBy}
        sortOrder={values.sortOrder as "asc" | "desc"}
        onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
        emptyTitle="No questions found"
        emptyDescription="Try expanding your search query or creating a new question to seed the bank."
      />
    </div>
  );
}
