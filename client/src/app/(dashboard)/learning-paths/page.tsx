"use client";

import { Layers, Plus, Route } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGetLearningPathsQuery } from "@/features/catalog/catalogApi";

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-success/10 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-destructive/10 text-destructive",
};

export default function LearningPathsPage() {
  const { data: paths, isLoading: pathsLoading } = useGetLearningPathsQuery();

  return (
    <div className="animate-fade-in space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Route className="h-7 w-7 text-primary" />
            Learning Path Curation
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sequence courses into a guided, step-by-step learning path within a subject.
          </p>
        </div>
        <Button
          asChild
          className="flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Link href="/learning-paths/create">
            <Plus className="h-4 w-4" /> Create Path
          </Link>
        </Button>
      </div>

      <Card className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display mb-4 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Paths
        </h2>

        {pathsLoading ? (
          <p className="text-xs text-muted-foreground">Loading paths...</p>
        ) : (paths ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No learning paths yet. Create one to sequence courses for learners.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(paths ?? []).map((path) => (
              <Link
                key={path.id}
                href={`/learning-paths/${path.id}`}
                className="rounded-2xl border border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-foreground">{path.title}</span>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold capitalize ${statusColors[path.status] || ""}`}
                  >
                    {path.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {path.learningSubject.name} · {path._count.pathCourses} course
                  {path._count.pathCourses === 1 ? "" : "s"} ·{" "}
                  {path.unlockMode === "SEQUENTIAL" ? "Sequential" : "Free roam"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
