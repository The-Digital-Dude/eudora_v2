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
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";

export interface LiveClassFormValues {
  classSectionId: string;
  title: string;
  startAt: string;
  endAt: string;
}

export const EMPTY_LIVE_CLASS: LiveClassFormValues = {
  classSectionId: "",
  title: "",
  startAt: "",
  endAt: "",
};

interface LiveClassFormProps {
  values: LiveClassFormValues;
  onChange: (next: LiveClassFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string | null;
  lockClassSection?: boolean;
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
  lockClassSection,
}: LiveClassFormProps) {
  const { data: classSectionsData } = useGetClassSectionsQuery();
  const classSections = classSectionsData?.items || [];

  const set = <K extends keyof LiveClassFormValues>(key: K, value: LiveClassFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Class section</Label>
        <Select
          value={values.classSectionId}
          onValueChange={(v) => set("classSectionId", v)}
          disabled={lockClassSection}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select class section" />
          </SelectTrigger>
          <SelectContent>
            {classSections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.code})
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
