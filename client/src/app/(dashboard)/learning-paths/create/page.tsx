"use client";

import { Route } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateLearningPathMutation,
  useGetLearningSubjectsQuery,
} from "@/features/catalog/catalogApi";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CreateLearningPathPage() {
  const router = useRouter();
  const { data: subjects } = useGetLearningSubjectsQuery();
  const [createLearningPath, { isLoading: creatingPath }] = useCreateLearningPathMutation();

  const [subjectId, setSubjectId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [unlockMode, setUnlockMode] = React.useState<"SEQUENTIAL" | "FREE_ROAM">("SEQUENTIAL");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setSubjectId((prev) => prev || subjects?.[0]?.id || "");
  }, [subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId) {
      setError("Subject and title are required.");
      return;
    }
    setError("");

    try {
      const created = await createLearningPath({
        learningSubjectId: subjectId,
        title,
        slug: slugify(title),
        unlockMode,
      }).unwrap();
      toast.success("Learning path created!");
      router.push(`/learning-paths/${created.id}`);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to create learning path.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6 font-sans">
      <div className="space-y-1">
        <Link
          href="/learning-paths"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Learning Paths
        </Link>
        <h1 className="font-display flex items-center gap-1.5 text-xl font-bold tracking-tight text-foreground">
          <Route className="h-5 w-5 text-primary" />
          Create Learning Path
        </h1>
        <p className="text-xs text-muted-foreground">
          A curated, ordered sequence of courses within a subject.
        </p>
      </div>

      <Card className="w-full rounded-3xl border border-border bg-card p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Subject
            </Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
              required
            >
              <option value="" disabled>
                Select subject
              </option>
              {(subjects ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Path Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Foundational Math"
              className="h-10 border-border text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Unlock Mode
            </Label>
            <select
              value={unlockMode}
              onChange={(e) => setUnlockMode(e.target.value as "SEQUENTIAL" | "FREE_ROAM")}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
            >
              <option value="SEQUENTIAL">Sequential (courses unlock in order)</option>
              <option value="FREE_ROAM">Free roam (all courses open)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/learning-paths")}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingPath}
              className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {creatingPath ? "Creating..." : "Create Path"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
