"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Batch } from "@/features/dashboard/dashboardApi";
import { useUpdateBatchMutation } from "@/features/dashboard/dashboardApi";

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none";
const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

interface BatchEnrollmentDialogProps {
  batch: Batch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Staff-only toggle for guardian self-enrollment on one `Batch`.
 * `isOpenForEnrollment` defaults false — nothing is guardian-enrollable
 * until set here, so this dialog is the only way that ever changes.
 */
export function BatchEnrollmentDialog({
  batch,
  open,
  onOpenChange,
}: BatchEnrollmentDialogProps) {
  const [updateBatch, { isLoading: isSaving }] = useUpdateBatchMutation();

  const [capacity, setCapacity] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!batch) return;
    setCapacity(batch.capacity != null ? String(batch.capacity) : "");
    setDescription(batch.description ?? "");
    setIsOpen(batch.isOpenForEnrollment);
    setError("");
  }, [batch]);

  const handleSave = async () => {
    if (!batch) return;
    setError("");
    try {
      await updateBatch({
        id: batch.id,
        body: {
          capacity: capacity ? Number(capacity) : null,
          description: description || null,
          isOpenForEnrollment: isOpen,
        },
      }).unwrap();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save enrollment settings.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enrollment settings</DialogTitle>
          <DialogDescription>
            {batch?.name} — control whether guardians can self-enroll their children.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Open for guardian enrollment</p>
              <p className="text-[10px] text-muted-foreground">
                Off by default — nothing is self-enrollable until you turn this on.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isOpen}
              onClick={() => setIsOpen((v) => !v)}
              className={`h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                isOpen ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`block h-5 w-5 translate-y-0.5 rounded-full bg-background transition-transform ${
                  isOpen ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="space-y-1">
            <Label className={labelClass}>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Unlimited"
              className="h-10 border-border text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className={labelClass}>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown to guardians browsing available classes"
              className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
