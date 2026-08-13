"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface LeadFormValues {
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  notes: string;
}

export const EMPTY_LEAD: LeadFormValues = {
  name: "",
  email: "",
  phone: "",
  status: "New",
  source: "Website Form",
  notes: "",
};

interface LeadFormProps {
  values: LeadFormValues;
  onChange: (next: LeadFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string;
}

const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";
const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none";

/** Shared by /leads/create and /leads/[id] so both routes stay a single form definition. */
export function LeadForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
}: LeadFormProps) {
  const set = <K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) =>
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
          <Label className={labelClass}>Full Name</Label>
          <Input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Charlotte Harris"
            className="h-10 border-border text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Email</Label>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="charlotte@example.com"
            className="h-10 border-border text-xs"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Phone</Label>
          <Input
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 019-8832"
            className="h-10 border-border text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Status</Label>
          <select
            value={values.status}
            onChange={(e) => set("status", e.target.value)}
            className={selectClass}
          >
            <option value="New">New</option>
            <option value="Diagnostic Scheduled">Diagnostic Scheduled</option>
            <option value="Pending Enrolment">Pending Enrolment</option>
            <option value="Enrolled">Enrolled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Source</Label>
          <select
            value={values.source}
            onChange={(e) => set("source", e.target.value)}
            className={selectClass}
          >
            <option value="Website Form">Website Form</option>
            <option value="Referral">Referral</option>
            <option value="Facebook Ad">Facebook Ad</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Internal Notes</Label>
        <textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Awaiting parent confirmation for diagnostic slot."
          className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        />
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
          className="h-10 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
