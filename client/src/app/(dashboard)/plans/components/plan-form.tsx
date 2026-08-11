"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PlanFormValues {
  name: string;
  description: string;
  priceMonthly: string;
  priceAnnual: string;
  currency: string;
  stripePriceIdMonthly: string;
  stripePriceIdAnnual: string;
  maxStudents: string;
  maxCampuses: string;
  maxPrograms: string;
  /** Comma-separated on the form, split into an array on submit. */
  features: string;
  isPublic: boolean;
}

export const EMPTY_PLAN: PlanFormValues = {
  name: "",
  description: "",
  priceMonthly: "29",
  priceAnnual: "290",
  currency: "USD",
  stripePriceIdMonthly: "",
  stripePriceIdAnnual: "",
  maxStudents: "",
  maxCampuses: "",
  maxPrograms: "",
  features: "",
  isPublic: true,
};

interface PlanFormProps {
  values: PlanFormValues;
  onChange: (next: PlanFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string;
}

const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

/** Shared by /plans/create and /plans/[id] so both routes stay a single form definition. */
export function PlanForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
}: PlanFormProps) {
  const set = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className={labelClass}>Plan Name</Label>
          <Input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Premium Plan"
            className="h-10 border-border text-xs"
            required
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label className={labelClass}>Description</Label>
          <textarea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="List features, limits, and program access"
            className="min-h-[60px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Price/Mo ($)</Label>
          <Input
            type="number"
            value={values.priceMonthly}
            onChange={(e) => set("priceMonthly", e.target.value)}
            className="h-10 border-border text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Price/Yr ($)</Label>
          <Input
            type="number"
            value={values.priceAnnual}
            onChange={(e) => set("priceAnnual", e.target.value)}
            className="h-10 border-border text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Currency</Label>
          <Input
            value={values.currency}
            onChange={(e) => set("currency", e.target.value.toUpperCase())}
            placeholder="USD"
            className="h-10 border-border text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Public on pricing page</Label>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-xs text-foreground">
            <input
              type="checkbox"
              checked={values.isPublic}
              onChange={(e) => set("isPublic", e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer"
            />
            Visible on /pricing
          </label>
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Max Students</Label>
          <Input
            type="number"
            value={values.maxStudents}
            onChange={(e) => set("maxStudents", e.target.value)}
            placeholder="Unlimited"
            className="h-10 border-border text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Max Campuses</Label>
          <Input
            type="number"
            value={values.maxCampuses}
            onChange={(e) => set("maxCampuses", e.target.value)}
            placeholder="Unlimited"
            className="h-10 border-border text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Max Programs</Label>
          <Input
            type="number"
            value={values.maxPrograms}
            onChange={(e) => set("maxPrograms", e.target.value)}
            placeholder="Unlimited"
            className="h-10 border-border text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Stripe Price ID (Mo)</Label>
          <Input
            value={values.stripePriceIdMonthly}
            onChange={(e) => set("stripePriceIdMonthly", e.target.value)}
            placeholder="price_..."
            className="h-10 border-border text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Stripe Price ID (Yr)</Label>
          <Input
            value={values.stripePriceIdAnnual}
            onChange={(e) => set("stripePriceIdAnnual", e.target.value)}
            placeholder="price_..."
            className="h-10 border-border text-xs"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label className={labelClass}>Features (comma-separated)</Label>
          <Input
            value={values.features}
            onChange={(e) => set("features", e.target.value)}
            placeholder="basic_analytics, api_access"
            className="h-10 border-border text-xs"
          />
        </div>
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
