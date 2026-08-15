"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Award, BookOpen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import { DataTable, SortableHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type LessonSummary, useGetConceptsQuery, useGetLessonsQuery } from "@/features/clio/clioApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

export default function LessonAuthoringPage() {
  const router = useRouter();
  const { values, setValue, setValues } = useListQueryState(
    { search: "", concept: "all", page: 1, pageSize: 10, sortBy: "", sortOrder: "asc" },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );
  const conceptFilter = values.concept;

  const { data: lessonsData, isLoading: lessonsLoading } = useGetLessonsQuery({
    conceptId: conceptFilter === "all" ? undefined : conceptFilter,
    search: values.search || undefined,
    page: values.page,
    limit: values.pageSize,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });
  const { data: concepts } = useGetConceptsQuery();

  const lessons = lessonsData?.items ?? [];
  const total = lessonsData?.total ?? 0;

  // Group concepts by their catalog course so authors can see chapter context
  const conceptGroups = React.useMemo(() => {
    const groups = new Map<string, { label: string; items: typeof concepts }>();
    for (const concept of concepts ?? []) {
      const key = concept.course?.id ?? "uncategorized";
      const label = concept.course?.title ?? "Uncategorized";
      if (!groups.has(key)) {
        groups.set(key, { label, items: [] as any });
      }
      groups.get(key)!.items!.push(concept);
    }
    return Array.from(groups.values());
  }, [concepts]);

  const columns: ColumnDef<LessonSummary, any>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => <SortableHeader column={column} label="Lesson / Concept" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{row.original.title}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Concept:{" "}
              <span className="font-semibold text-muted-foreground">
                {row.original.concept?.name || "Uncategorized"}
              </span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "sortOrder",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Sort Order
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-bold text-muted-foreground">{row.original.sortOrder}</span>
      ),
    },
    {
      accessorKey: "xpReward",
      header: ({ column }) => <SortableHeader column={column} label="XP Reward" />,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-[10px] font-bold text-warning">
          <Award className="h-3 w-3 text-warning" />+{row.original.xpReward} XP
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
      cell: ({ row }) => (
        <Link href={`/lessons/${row.original.id}`} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="ml-auto h-8 rounded-lg border-border px-2.5 text-xs font-bold"
          >
            Edit Flow
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <BookOpen className="h-7 w-7 text-primary" />
            Curriculum & Lesson Authoring
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Design dynamic journey units, configure XP checkpoints, and build card-stepper workflows
            for students.
          </p>
        </div>
        <Button
          asChild
          className="flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Link href="/lessons/create">
            <Plus className="h-4 w-4" /> Create Lesson
          </Link>
        </Button>
      </div>

      {/* Journey Directory Table */}
      <Card className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Journey Units</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              value={conceptFilter}
              onChange={(e) => setValue("concept", e.target.value)}
              className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Concepts</option>
              {conceptGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items!.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder="Search lessons by title..."
              />
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={lessons}
          isLoading={lessonsLoading}
          page={values.page}
          pageSize={values.pageSize}
          total={total}
          onPageChange={(next) => setValue("page", next)}
          onPageSizeChange={(size) => setValue("pageSize", size)}
          paginationLabel="lesson"
          sortBy={values.sortBy}
          sortOrder={values.sortOrder as "asc" | "desc"}
          onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
          onRowClick={(lesson) => router.push(`/lessons/${lesson.id}`)}
          emptyTitle="No lessons available"
          emptyDescription='Click "Create Lesson" to build your first curriculum unit.'
        />
      </Card>
    </div>
  );
}
