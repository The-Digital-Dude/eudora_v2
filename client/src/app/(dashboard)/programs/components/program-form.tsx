"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetClassesQuery } from "@/features/assessments/questionsApi";
import type { CatalogStatus, DeliveryMode } from "@/features/dashboard/dashboardApi";

export interface ProgramFormValues {
  name: string;
  code: string;
  slug: string;
  /** Empty string = standalone bundle, outside the Class -> Program tree. */
  classId: string;
  shortDescription: string;
  description: string;
  deliveryMode: DeliveryMode;
  durationMonths: string;
  /** Held as major units (dollars) in the form; converted to cents on submit. */
  priceOneTime: string;
  priceMonthly: string;
  installmentCount: string;
  status: CatalogStatus;
}

export const EMPTY_PROGRAM: ProgramFormValues = {
  name: "",
  code: "",
  slug: "",
  classId: "",
  shortDescription: "",
  description: "",
  deliveryMode: "SELF_PACED",
  durationMonths: "",
  priceOneTime: "",
  priceMonthly: "",
  installmentCount: "",
  status: "DRAFT",
};

/**
 * Prices are stored as integer cents. The form takes dollars because that is
 * what an admin thinks in, and rounds at the boundary so no float ever reaches
 * the API.
 */
export function dollarsToCents(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

export function centsToDollars(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return (value / 100).toFixed(2);
}

/**
 * Form values -> API payload. Shared by create and edit so the money conversion
 * and the "empty string means null" rules only exist once.
 */
export function toProgramPayload(values: ProgramFormValues) {
  const optionalInt = (raw: string) => {
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    name: values.name,
    code: values.code.toUpperCase(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    classId: values.classId || undefined,
    shortDescription: values.shortDescription || undefined,
    description: values.description || undefined,
    deliveryMode: values.deliveryMode,
    durationMonths: optionalInt(values.durationMonths),
    priceOneTimeCents: dollarsToCents(values.priceOneTime),
    priceMonthlyCents: dollarsToCents(values.priceMonthly),
    installmentCount: optionalInt(values.installmentCount),
    status: values.status,
  };
}

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
const inputClass = "h-10 border-border text-xs";
const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none";
const hintClass = "text-[10px] text-muted-foreground";

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
  const { data: classesData } = useGetClassesQuery();
  const classes = classesData?.items ?? [];

  const set = <K extends keyof ProgramFormValues>(key: K, value: ProgramFormValues[K]) =>
    onChange({ ...values, [key]: value });

  const oneTimeCents = dollarsToCents(values.priceOneTime);
  const monthlyCents = dollarsToCents(values.priceMonthly);
  const installments = Number(values.installmentCount);

  // Mirrors the server-side floor: below $9 Stripe's fixed fee plus one support
  // interaction erases the margin.
  const belowFloor =
    (oneTimeCents !== undefined && oneTimeCents > 0 && oneTimeCents < 900) ||
    (monthlyCents !== undefined && monthlyCents > 0 && monthlyCents < 900);

  const monthlyMissingCount = monthlyCents !== undefined && monthlyCents > 0 && !installments;

  // The final installment absorbs the rounding remainder, so show the admin the
  // real schedule rather than a number that does not add up.
  const installmentPreview =
    oneTimeCents && installments >= 2
      ? (() => {
          const base = Math.floor(oneTimeCents / installments);
          const final = oneTimeCents - base * (installments - 1);
          return `${installments} x $${(base / 100).toFixed(2)} (final $${(final / 100).toFixed(2)})`;
        })()
      : null;

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
            placeholder="e.g. Class 9 Science"
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Program Code</Label>
          <Input
            value={values.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="e.g. C9-SCI"
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>URL Slug</Label>
          <Input
            value={values.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="derived from name if left blank"
            className={inputClass}
          />
          <p className={hintClass}>Public URL. Changing it breaks existing links.</p>
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Class</Label>
          <select
            value={values.classId}
            onChange={(e) => set("classId", e.target.value)}
            className={selectClass}
          >
            <option value="">None (standalone bundle)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className={hintClass}>Leave empty for packs sold outside the class tree.</p>
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Short Description</Label>
        <Input
          value={values.shortDescription}
          onChange={(e) => set("shortDescription", e.target.value)}
          placeholder="One line, used as the search-result description"
          className={inputClass}
          maxLength={160}
        />
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Description</Label>
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What this program covers and who it is for"
          className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Delivery Mode</Label>
          <select
            value={values.deliveryMode}
            onChange={(e) => set("deliveryMode", e.target.value as DeliveryMode)}
            className={selectClass}
          >
            <option value="SELF_PACED">Self-paced</option>
            <option value="LIVE">Live</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Duration (Months)</Label>
          <Input
            type="number"
            min="1"
            value={values.durationMonths}
            onChange={(e) => set("durationMonths", e.target.value)}
            placeholder="blank = no fixed length"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-3">
        <p className={labelClass}>Pricing</p>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className={labelClass}>One-time ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={values.priceOneTime}
              onChange={(e) => set("priceOneTime", e.target.value)}
              placeholder="100.00"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Monthly ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={values.priceMonthly}
              onChange={(e) => set("priceMonthly", e.target.value)}
              placeholder="optional"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Installments</Label>
            <Input
              type="number"
              min="2"
              value={values.installmentCount}
              onChange={(e) => set("installmentCount", e.target.value)}
              placeholder="e.g. 3"
              className={inputClass}
            />
          </div>
        </div>

        {installmentPreview && (
          <p className={hintClass}>Schedule: {installmentPreview}</p>
        )}
        {monthlyMissingCount && (
          <p className="text-[10px] font-semibold text-destructive">
            Set an installment count when a monthly price is given.
          </p>
        )}
        {belowFloor && (
          <p className="text-[10px] font-semibold text-destructive">
            Minimum sellable price is $9.00. Below that, card fees erase the margin.
          </p>
        )}
        <p className={hintClass}>
          Leave both blank if this program is not sold directly.
        </p>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Status</Label>
        <select
          value={values.status}
          onChange={(e) => set("status", e.target.value as CatalogStatus)}
          className={selectClass}
        >
          <option value="DRAFT">DRAFT (not visible publicly)</option>
          <option value="PUBLISHED">PUBLISHED (live in the catalog)</option>
          <option value="ARCHIVED">ARCHIVED</option>
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
          disabled={isSaving || belowFloor || monthlyMissingCount}
          className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
