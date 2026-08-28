"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CourseSummary, GradeBand } from "@/features/catalog/catalogApi";
import { useGetLearningSubjectsQuery } from "@/features/catalog/catalogApi";
import type { CatalogStatus, DeliveryMode } from "@/features/dashboard/dashboardApi";
import {
  centsToDollars,
  dollarsToCents,
  installmentPreview,
  MIN_SELLABLE_PRICE_CENTS,
} from "@/lib/money";

export interface CourseFormValues {
  learningSubjectId: string;
  title: string;
  slug: string;
  description: string;
  estimatedHours: string;
  durationWeeks: string;
  thumbnailUrl: string;
  /** Empty string = uncategorised, which hides it from the public browse filter. */
  gradeBand: GradeBand | "";
  deliveryMode: DeliveryMode;
  /** Held as major units (dollars) in the form; converted to cents on submit. */
  priceOneTime: string;
  priceMonthly: string;
  installmentCount: string;
  status: CatalogStatus;
}

export const EMPTY_COURSE: CourseFormValues = {
  learningSubjectId: "",
  title: "",
  slug: "",
  description: "",
  estimatedHours: "",
  durationWeeks: "",
  thumbnailUrl: "",
  gradeBand: "",
  deliveryMode: "SELF_PACED",
  priceOneTime: "",
  priceMonthly: "",
  installmentCount: "",
  status: "DRAFT",
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * An existing course -> form values, for the edit screen. Takes the editable
 * fields only: `_count` is a list-view concern no form reads.
 */
export function courseToFormValues(
  course: Omit<CourseSummary, "_count">,
): CourseFormValues {
  return {
    learningSubjectId: course.learningSubjectId,
    title: course.title,
    slug: course.slug,
    description: course.description ?? "",
    estimatedHours: course.estimatedHours?.toString() ?? "",
    durationWeeks: course.durationWeeks?.toString() ?? "",
    thumbnailUrl: course.thumbnailUrl ?? "",
    gradeBand: course.gradeBand ?? "",
    deliveryMode: course.deliveryMode ?? "SELF_PACED",
    priceOneTime: centsToDollars(course.priceOneTimeCents),
    priceMonthly: centsToDollars(course.priceMonthlyCents),
    installmentCount: course.installmentCount?.toString() ?? "",
    status: course.status,
  };
}

/**
 * Form values -> API payload. Shared by create and edit so the money conversion
 * and the "blank means null" rules only exist once.
 *
 * Blank prices send explicit null rather than undefined: on edit those differ,
 * because undefined means "leave alone" and null means "clear it". Sending
 * undefined would make it impossible to un-price a course.
 */
export function toCoursePayload(values: CourseFormValues) {
  const optionalInt = (raw: string) => {
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    learningSubjectId: values.learningSubjectId,
    title: values.title.trim(),
    slug: values.slug.trim() || slugify(values.title),
    description: values.description || undefined,
    estimatedHours: optionalInt(values.estimatedHours),
    durationWeeks: optionalInt(values.durationWeeks),
    thumbnailUrl: values.thumbnailUrl.trim() || undefined,
    gradeBand: values.gradeBand || undefined,
    deliveryMode: values.deliveryMode,
    priceOneTimeCents: dollarsToCents(values.priceOneTime) ?? null,
    priceMonthlyCents: dollarsToCents(values.priceMonthly) ?? null,
    installmentCount: optionalInt(values.installmentCount) ?? null,
    status: values.status,
  };
}

interface CourseFormProps {
  values: CourseFormValues;
  onChange: (next: CourseFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string;
  /** Editing an existing course: the subject and slug are settled, so they lock. */
  isEdit?: boolean;
}

const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";
const inputClass = "h-10 border-border text-xs";
const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none";
const hintClass = "text-[10px] text-muted-foreground";

const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  PRE_K_K: "Pre-K/K",
  G1_2: "Grades 1-2",
  G3_4: "Grades 3-4",
  G5_6: "Grades 5-6",
};

/** Shared by /courses/create and /courses/[id]. */
export function CourseForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
  isEdit = false,
}: CourseFormProps) {
  const { data: subjects } = useGetLearningSubjectsQuery();

  const set = <K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) =>
    onChange({ ...values, [key]: value });

  const oneTimeCents = dollarsToCents(values.priceOneTime);
  const monthlyCents = dollarsToCents(values.priceMonthly);
  const installments = Number(values.installmentCount);

  // Mirrors the server floor: below $9 Stripe's fixed fee plus one support
  // interaction erases the margin.
  const belowFloor =
    (oneTimeCents !== undefined &&
      oneTimeCents > 0 &&
      oneTimeCents < MIN_SELLABLE_PRICE_CENTS) ||
    (monthlyCents !== undefined &&
      monthlyCents > 0 &&
      monthlyCents < MIN_SELLABLE_PRICE_CENTS);

  const monthlyMissingCount =
    monthlyCents !== undefined && monthlyCents > 0 && !installments;

  // Mirrors the server publish guard. Warned about here so the admin sees it
  // while typing rather than as a rejection after pressing save.
  const publishedWithoutPrice = values.status === "PUBLISHED" && !oneTimeCents;

  const schedule = installmentPreview(oneTimeCents, installments);

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
          <Label className={labelClass}>Subject</Label>
          <select
            value={values.learningSubjectId}
            onChange={(e) => set("learningSubjectId", e.target.value)}
            className={selectClass}
            disabled={isEdit}
            required
          >
            <option value="" disabled>
              Select subject
            </option>
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {isEdit && <p className={hintClass}>Subject cannot be changed after creation.</p>}
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Course Title</Label>
          <Input
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Algebra Fundamentals"
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>URL Slug</Label>
        <Input
          value={values.slug}
          onChange={(e) => set("slug", e.target.value)}
          placeholder="derived from the title if left blank"
          className={inputClass}
          disabled={isEdit}
        />
        <p className={hintClass}>
          {isEdit
            ? "Fixed after creation. Changing it would break the public URL and any inbound links."
            : "Public URL for this course."}
        </p>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Description</Label>
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What this course covers and who it is for"
          className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Grade Band</Label>
          <select
            value={values.gradeBand}
            onChange={(e) => set("gradeBand", e.target.value as GradeBand | "")}
            className={selectClass}
          >
            <option value="">Uncategorised</option>
            {(Object.keys(GRADE_BAND_LABELS) as GradeBand[]).map((band) => (
              <option key={band} value={band}>
                {GRADE_BAND_LABELS[band]}
              </option>
            ))}
          </select>
          <p className={hintClass}>Drives the public browse filter.</p>
        </div>
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
          <Label className={labelClass}>Thumbnail URL</Label>
          <Input
            value={values.thumbnailUrl}
            onChange={(e) => set("thumbnailUrl", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Estimated Hours</Label>
          <Input
            type="number"
            min="0"
            value={values.estimatedHours}
            onChange={(e) => set("estimatedHours", e.target.value)}
            placeholder="10"
            className={inputClass}
          />
          <p className={hintClass}>Content effort.</p>
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Duration (Weeks)</Label>
          <Input
            type="number"
            min="1"
            value={values.durationWeeks}
            onChange={(e) => set("durationWeeks", e.target.value)}
            placeholder="blank = no fixed length"
            className={inputClass}
          />
          <p className={hintClass}>Calendar length.</p>
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
              placeholder="49.00"
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

        {schedule && <p className={hintClass}>Schedule: {schedule}</p>}
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
          Leave blank if this course is sold only as part of a program.
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
        {publishedWithoutPrice && (
          <p className="text-[10px] font-semibold text-warning">
            With no price of its own, this course can only be published if a program
            it belongs to carries the pricing. Otherwise nobody can buy it.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-10 rounded-xl text-xs font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
