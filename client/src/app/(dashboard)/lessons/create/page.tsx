"use client";

import { Award, Hash, PenTool } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLessonMutation, useGetConceptsQuery, useGetLessonsQuery } from "@/features/clio/clioApi";

export default function CreateLessonPage() {
  const router = useRouter();
  const { data: lessonsData } = useGetLessonsQuery();
  const lessons = lessonsData?.items;
  const { data: concepts, isLoading: conceptsLoading } = useGetConceptsQuery();
  const [createLesson, { isLoading: creatingLesson }] = useCreateLessonMutation();

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

  const [title, setTitle] = React.useState("");
  const [conceptId, setConceptId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState(1);
  const [xpReward, setXpReward] = React.useState(50);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setConceptId((prev) => prev || concepts?.[0]?.id || "");
    setSortOrder((lessons?.length ?? 0) + 1);
  }, [concepts, lessons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !conceptId) {
      setError("Lesson Title and Curriculum Concept are required.");
      return;
    }
    setError("");

    try {
      const lesson = await createLesson({
        title,
        conceptId,
        description: description || undefined,
        sortOrder: Number(sortOrder),
        xpReward: Number(xpReward),
      }).unwrap();
      toast.success("Lesson unit created successfully!");
      router.push(`/lessons/${lesson.id}`);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to create lesson unit.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6 font-sans">
      <div className="space-y-1">
        <Link
          href="/lessons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Lessons
        </Link>
        <h1 className="font-display flex items-center gap-1.5 text-xl font-bold tracking-tight text-foreground">
          <PenTool className="h-5 w-5 text-primary" />
          Create Lesson Unit
        </h1>
        <p className="text-xs text-muted-foreground">
          Create a new interactive learning unit associated with a curriculum concept. The card
          deck can be authored once the unit is saved.
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
              Curriculum Concept
            </Label>
            {conceptsLoading ? (
              <div className="flex h-10 items-center rounded-xl border border-border bg-muted/50 px-3">
                <span className="text-xs text-muted-foreground">Loading concepts...</span>
              </div>
            ) : (
              <select
                value={conceptId}
                onChange={(e) => setConceptId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                required
              >
                <option value="" disabled>
                  Select Curriculum Concept
                </option>
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
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Lesson Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fractions 101: Introduction"
              className="h-10 border-border text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Introduce students to fraction denominators..."
              className="h-10 border-border text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Sort Order
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                </span>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="h-10 border-border pl-9 text-xs"
                  required
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                XP Reward
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                </span>
                <Input
                  type="number"
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="h-10 border-border pl-9 text-xs"
                  required
                  min={10}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/lessons")}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingLesson}
              className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {creatingLesson ? "Creating..." : "Create Unit"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
