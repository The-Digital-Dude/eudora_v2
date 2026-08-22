"use client";

import { GraduationCap, Loader2, Pencil, Plus, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CatalogStatus,
  type ClassItem,
  useCreateClassMutation,
  useGetClassesQuery,
  useUpdateClassMutation,
} from "@/features/assessments/questionsApi";

/**
 * Admin surface for the `Class` taxonomy master.
 *
 * Titled "Grades" — the word the public catalogue already uses ("Grades 1–2"
 * on /explore) — so a parent and an operator name the same thing the same way.
 * The model stays `Class`, and every row in it is literally a grade level. The
 * cohort model has since been renamed `CourseClass` -> `Batch`, which leaves
 * only `ClassSection` (the roster behind /classes) still sharing the word.
 */
const STATUS_LABELS: Record<CatalogStatus, string> = {
  DRAFT: "Draft, hidden from the catalogue",
  PUBLISHED: "Published, visible publicly",
  ARCHIVED: "Archived",
};

const labelClass =
  "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";
const inputClass = "h-10 border-border text-xs";
const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none";

export default function GradeLevelsPage() {
  const { data, isLoading } = useGetClassesQuery();
  const [editing, setEditing] = React.useState<ClassItem | null>(null);
  const [creating, setCreating] = React.useState(false);

  const classes = data?.items ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Grades
          </h1>
          <p className="text-xs text-muted-foreground">
            The top of the catalogue: every programme hangs off one of these,
            and a child&apos;s grade is chosen from this list.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add grade level
        </Button>
      </div>

      {creating && (
        <ClassForm
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : classes.length === 0 ? (
        <Card className="space-y-2 rounded-3xl border border-dashed border-border py-12 text-center">
          <GraduationCap className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground">
            No grade levels yet
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {classes.map((item) =>
            editing?.id === item.id ? (
              <ClassForm
                key={item.id}
                existing={item}
                onDone={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <Card
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                      {item.code}
                    </span>
                    <h2 className="font-display text-sm font-bold text-foreground">
                      {item.name}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        item.status === "PUBLISHED"
                          ? "border border-success/20 bg-success/10 text-success"
                          : "border border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.description || "No description"}
                    <span className="ml-2 font-mono">/{item.slug}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(item);
                    setCreating(false);
                  }}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </Card>
            ),
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Grade levels can&apos;t be deleted, because assessments, questions and
        programmes reference them. Archive instead.
      </p>
    </div>
  );
}

function ClassForm({
  existing,
  onDone,
  onCancel,
}: {
  existing?: ClassItem;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = React.useState(existing?.code ?? "");
  const [name, setName] = React.useState(existing?.name ?? "");
  const [description, setDescription] = React.useState(
    existing?.description ?? "",
  );
  const [sortOrder, setSortOrder] = React.useState(
    String(existing?.sortOrder ?? 0),
  );
  const [status, setStatus] = React.useState<CatalogStatus>(
    existing?.status ?? "DRAFT",
  );

  const [createClass, { isLoading: creating }] = useCreateClassMutation();
  const [updateClass, { isLoading: updating }] = useUpdateClassMutation();
  const isSaving = creating || updating;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedSort = parseInt(sortOrder, 10);

    try {
      if (existing) {
        await updateClass({
          id: existing.id,
          name,
          description,
          status,
          sortOrder: Number.isFinite(parsedSort) ? parsedSort : 0,
        }).unwrap();
        toast.success("Grade level updated");
      } else {
        await createClass({
          code,
          name,
          description: description || undefined,
          status,
          sortOrder: Number.isFinite(parsedSort) ? parsedSort : 0,
        }).unwrap();
        toast.success("Grade level added");
      }
      onDone();
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not save this grade level.");
    }
  };

  return (
    <Card className="rounded-2xl border border-foreground/20 bg-card p-5 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">
            {existing ? `Edit ${existing.name}` : "New grade level"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className={labelClass}>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. G2"
              className={inputClass}
              // Immutable after creation: assessments and questions are keyed
              // to this class, and the code is how staff recognise it.
              disabled={!!existing}
              required
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className={labelClass}>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 2"
              className={inputClass}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional, shown on the public class page"
            className={inputClass}
            maxLength={500}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className={labelClass}>Display order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputClass}
            />
            <p className="text-[10px] text-muted-foreground">
              Lower comes first. Use the year number.
            </p>
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CatalogStatus)}
              className={selectClass}
            >
              {(Object.keys(STATUS_LABELS) as CatalogStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {existing && name !== existing.name && (
          <p className="rounded-xl border border-warning/20 bg-warning/10 p-2 text-[10px] font-semibold text-foreground">
            Renaming regenerates the URL slug, which breaks any existing links
            to this class.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 cursor-pointer rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !name.trim() || (!existing && !code.trim())}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {existing ? "Save changes" : "Add grade level"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
