"use client";

import { ArrowRight, GraduationCap, Loader2, Pencil, Plus, School, X } from "lucide-react";
import Link from "next/link";
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
import { useGetProgramsQuery, useUpdateProgramMutation } from "@/features/dashboard/dashboardApi";
import { formatPrice } from "@/lib/public-catalog";

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
        // A grade level is a handful of short fields — code, name, status, one
        // line of description. The previous layout gave each one a full-width
        // horizontal bar, which at any reasonable viewport left most of the
        // row empty and, once the row got too cramped to fit the edit button
        // inline, wrapped it onto its own line pinned to the left edge rather
        // than the right. A grid of compact cards uses the width instead of
        // stretching past its content.
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((item) =>
            editing?.id === item.id ? (
              // Spans the full grid row at every breakpoint the grid defines,
              // so the form gets a full-width row to work with instead of
              // being squeezed into one card's column.
              <div key={item.id} className="sm:col-span-2 lg:col-span-3">
                <ClassForm
                  existing={item}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <Card
                key={item.id}
                className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                      {item.code}
                    </span>
                    <h2 className="font-display truncate text-sm font-bold text-foreground">
                      {item.name}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      item.status === "PUBLISHED"
                        ? "border border-success/20 bg-success/10 text-success"
                        : "border border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {item.description || "No description"}
                  <br />
                  <span className="font-mono">/{item.slug}</span>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(item);
                    setCreating(false);
                  }}
                  className="mt-auto inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted"
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

        {/* Only for a class that already exists: a program has to point at a
            real classId, so this has nowhere to attach to during creation. */}
        {existing && <ProgramsUnderClass classItem={existing} />}

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

/**
 * The programs that hang off this grade, with a way to attach an existing one
 * without leaving the grade screen.
 *
 * Picks from programs that already exist rather than opening a creation form
 * here: a program is a full sellable SKU with its own pricing, delivery mode
 * and Stripe-facing fields, all of which already have one home at
 * `/programs/create`. This screen's job is the Class <-> Program link, not a
 * second place to author a program.
 */
function ProgramsUnderClass({ classItem }: { classItem: ClassItem }) {
  const { data, isLoading } = useGetProgramsQuery({ limit: 200 });
  const [updateProgram, { isLoading: isAssigning }] = useUpdateProgramMutation();
  const [selectedId, setSelectedId] = React.useState("");

  const allPrograms = data?.items ?? [];
  const programsHere = allPrograms.filter((p) => p.classId === classItem.id);
  // Reassignment is allowed, not just attaching an unassigned one — a program
  // filed under the wrong grade is exactly the kind of mistake this picker
  // should be able to fix without a trip to that program's own edit page.
  const availablePrograms = allPrograms.filter((p) => p.classId !== classItem.id);

  const handleAssign = async () => {
    if (!selectedId) return;
    try {
      await updateProgram({ id: selectedId, body: { classId: classItem.id } }).unwrap();
      toast.success("Program added to this grade");
      setSelectedId("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not add this program.");
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <p className={labelClass}>Programs under {classItem.name}</p>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : programsHere.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No programs under this grade yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {programsHere.map((program) => (
            <Link
              key={program.id}
              href={`/programs/${program.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-2">
                <School className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-semibold text-foreground">{program.name}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    program.status === "PUBLISHED"
                      ? "border border-success/20 bg-success/10 text-success"
                      : "border border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {program.status}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                {formatPrice(program.priceOneTimeCents) ||
                  (program.priceMonthlyCents ? `${formatPrice(program.priceMonthlyCents)}/mo` : "Unpriced")}
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      )}

      {availablePrograms.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`${selectClass} flex-1`}
          >
            <option value="">Choose an existing program...</option>
            {availablePrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.class ? `currently ${program.class.name}` : "standalone"})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedId || isAssigning}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAssigning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Add
          </button>
        </div>
      )}
    </div>
  );
}
