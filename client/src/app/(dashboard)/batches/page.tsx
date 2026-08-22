"use client";

import { CalendarClock, Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Batch } from "@/features/dashboard/dashboardApi";
import {
  useDeleteBatchMutation,
  useGetBatchesQuery,
  useUpdateBatchMutation,
} from "@/features/dashboard/dashboardApi";

import { BatchForm } from "./components/batch-form";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function BatchesPage() {
  const { data, isLoading } = useGetBatchesQuery({ limit: 100 });
  const [updateBatch] = useUpdateBatchMutation();
  const [deleteBatch] = useDeleteBatchMutation();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Batch | null>(null);

  const batches = data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (batch: Batch) => {
    setEditing(batch);
    setFormOpen(true);
  };

  // The enrolment switch is the gate on the whole purchase path: checkout
  // rejects any batch where this is false, and it defaults to false. It is on
  // the row rather than buried in the form so the sellable/not-sellable state
  // of every batch is visible at a glance.
  const toggleEnrolment = async (batch: Batch) => {
    try {
      await updateBatch({
        id: batch.id,
        body: { isOpenForEnrollment: !batch.isOpenForEnrollment },
      }).unwrap();
      toast.success(
        batch.isOpenForEnrollment
          ? "Closed for enrolment."
          : "Open for enrolment. Guardians can now buy a seat.",
      );
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update enrolment.");
    }
  };

  const handleDelete = async (batch: Batch) => {
    const enrolled = batch._count?.enrollments ?? 0;
    if (enrolled > 0) {
      toast.error(`${batch.name} has ${enrolled} enrolled student(s) and cannot be deleted.`);
      return;
    }
    if (!confirm(`Delete "${batch.name}"? This cannot be undone.`)) return;
    try {
      await deleteBatch(batch.id).unwrap();
      toast.success("Batch deleted.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete batch.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Layers className="h-5 w-5 text-primary" />
            Batches
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Dated cohorts of a course. A live course is sold as a seat in one of these.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New batch
        </Button>
      </div>

      <Card className="rounded-3xl border border-border bg-card p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : batches.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">No batches yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create one to start selling seats in a live course.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Batch</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Lead teacher</th>
                  <th className="px-5 py-3">Dates</th>
                  <th className="px-5 py-3">Seats</th>
                  <th className="px-5 py-3">Open</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const enrolled = b._count?.enrollments ?? 0;
                  return (
                    <tr key={b.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3">
                        <p className="text-xs font-semibold text-foreground">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground">{b.code}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {b.course ? (
                          b.course.title
                        ) : (
                          <span className="text-warning">Not sellable: no course</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {b.leadTeacher?.fullName ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[10px] text-muted-foreground">
                        {formatDate(b.startDate)} – {formatDate(b.endDate)}
                      </td>
                      <td className="px-5 py-3 text-xs text-foreground">
                        {enrolled}
                        {b.capacity ? ` / ${b.capacity}` : ""}
                      </td>
                      <td className="px-5 py-3">
                        <Switch
                          checked={b.isOpenForEnrollment}
                          onCheckedChange={() => toggleEnrolment(b)}
                          aria-label={`Toggle enrolment for ${b.name}`}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/batches/${b.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                            aria-label={`Schedule for ${b.name}`}
                            title="Schedule"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(b)}
                            aria-label={`Edit ${b.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(b)}
                            aria-label={`Delete ${b.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit batch" : "New batch"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Changing the end date moves when live access expires for everyone in this batch."
                : "New batches start closed for enrolment. Open them from the list when ready to sell."}
            </DialogDescription>
          </DialogHeader>
          <BatchForm
            existing={editing}
            onDone={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
