"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetBatchesQuery } from "@/features/dashboard/dashboardApi";

export interface LiveClassFormValues {
  /** A live class is met by a cohort, so it is scheduled against a batch. */
  batchId: string;
  title: string;
  startAt: string;
  endAt: string;
  /**
   * Zoom, Meet, Teams — whatever room the teacher already uses. Empty means
   * the session has a time but no way in yet, which is a normal state while a
   * term is being planned.
   */
  joinUrl: string;
}

export const EMPTY_LIVE_CLASS: LiveClassFormValues = {
  batchId: "",
  title: "",
  startAt: "",
  endAt: "",
  joinUrl: "",
};

interface LiveClassFormProps {
  values: LiveClassFormValues;
  onChange: (next: LiveClassFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string | null;
  lockBatch?: boolean;
}

/** Shared by /live-classes/create and the Reschedule dialog so both stay a single form definition. */
export function LiveClassForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
  lockBatch,
}: LiveClassFormProps) {
  const { data: batchesData } = useGetBatchesQuery();
  const batches = batchesData?.items || [];

  const set = <K extends keyof LiveClassFormValues>(key: K, value: LiveClassFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Batch</Label>
        <Select
          value={values.batchId}
          onValueChange={(v) => set("batchId", v)}
          disabled={lockBatch}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({b.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-class-title">Title</Label>
        <Input
          id="live-class-title"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Fractions review session"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="live-class-start">Starts at</Label>
          <Input
            id="live-class-start"
            type="datetime-local"
            value={values.startAt}
            onChange={(e) => set("startAt", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="live-class-end">Ends at</Label>
          <Input
            id="live-class-end"
            type="datetime-local"
            value={values.endAt}
            onChange={(e) => set("endAt", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-class-join-url">Meeting link</Label>
        <Input
          id="live-class-join-url"
          type="url"
          value={values.joinUrl}
          onChange={(e) => set("joinUrl", e.target.value)}
          placeholder="https://zoom.us/j/..."
        />
        <p className="text-[11px] text-muted-foreground">
          Paste the room you already use. Families see a Join button as soon as
          this is saved; without it they see the time and no way in. Clear the
          field to remove the link.
        </p>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
