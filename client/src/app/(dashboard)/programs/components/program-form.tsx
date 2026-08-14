"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProgramFormValues {
  name: string;
  code: string;
  description: string;
  durationYears: string;
  status: "ACTIVE" | "INACTIVE";
}

export const EMPTY_PROGRAM: ProgramFormValues = {
  name: "",
  code: "",
  description: "",
  durationYears: "4",
  status: "ACTIVE",
};

interface ProgramFormProps {
  values: ProgramFormValues;
  onChange: (next: ProgramFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string;
}

const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

/** Shared by /programs/create and /programs/[id]. */
export function ProgramForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
}: ProgramFormProps) {
  const set = <K extends keyof ProgramFormValues>(key: K, value: ProgramFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Program Name</Label>
          <Input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Computer Science"
            className="h-10 border-border text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Program Code</Label>
          <Input
            value={values.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="e.g. CS-BS"
            className="h-10 border-border text-xs"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Description</Label>
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Degree program objectives and details"
          className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Duration (Years)</Label>
          <Input
            type="number"
            min="1"
            max="7"
            value={values.durationYears}
            onChange={(e) => set("durationYears", e.target.value)}
            className="h-10 border-border text-xs"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Status</Label>
        <select
          value={values.status}
          onChange={(e) => set("status", e.target.value as "ACTIVE" | "INACTIVE")}
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10 cursor-pointer rounded-xl text-xs font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
