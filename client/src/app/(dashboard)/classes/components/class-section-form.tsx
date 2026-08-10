"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetLearningSubjectsQuery } from "@/features/catalog/catalogApi";
import {
  useGetAcademicYearsQuery,
  useGetProgramsQuery,
} from "@/features/dashboard/dashboardApi";

export interface ClassSectionFormValues {
  name: string;
  code: string;
  programId: string;
  academicYearId: string;
  /** Grade level, e.g. "Grade 10". Named `class` to match the column it maps to. */
  class: string;
  classroom: string;
  /** Empty string means "no subject tagged" — sent to the API as null. */
  learningSubjectId: string;
  status: "ACTIVE" | "INACTIVE";
}

export const EMPTY_CLASS_SECTION: ClassSectionFormValues = {
  name: "",
  code: "",
  programId: "",
  academicYearId: "",
  class: "",
  classroom: "",
  learningSubjectId: "",
  status: "ACTIVE",
};

interface ClassSectionFormProps {
  values: ClassSectionFormValues;
  onChange: (next: ClassSectionFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string;
}

const labelClass =
  "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";
const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none";

/** Shared by /classes/create and /classes/[id] so both routes stay a single form definition. */
export function ClassSectionForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
}: ClassSectionFormProps) {
  const { data: programsData } = useGetProgramsQuery();
  const { data: yearsData } = useGetAcademicYearsQuery();
  const { data: subjects } = useGetLearningSubjectsQuery();

  const set = <K extends keyof ClassSectionFormValues>(
    key: K,
    value: ClassSectionFormValues[K],
  ) => onChange({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className={labelClass}>Section Name</Label>
          <Input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="CS Section A"
            className="h-10 border-border text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Section Code</Label>
          <Input
            value={values.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="CS-2026-A"
            className="h-10 border-border text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Program</Label>
          <select
            value={values.programId}
            onChange={(e) => set("programId", e.target.value)}
            className={selectClass}
            required
          >
            <option value="" disabled>
              Select a program
            </option>
            {(programsData?.items ?? []).map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Academic Year</Label>
          <select
            value={values.academicYearId}
            onChange={(e) => set("academicYearId", e.target.value)}
            className={selectClass}
            required
          >
            <option value="" disabled>
              Select an academic year
            </option>
            {(yearsData?.items ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Subject</Label>
          <select
            value={values.learningSubjectId}
            onChange={(e) => set("learningSubjectId", e.target.value)}
            className={selectClass}
          >
            <option value="">No subject</option>
            {(subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            Tagged per section, since a program can span several subjects.
          </p>
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Grade Level</Label>
          <Input
            value={values.class}
            onChange={(e) => set("class", e.target.value)}
            placeholder="Grade 10"
            className="h-10 border-border text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Classroom</Label>
          <Input
            value={values.classroom}
            onChange={(e) => set("classroom", e.target.value)}
            placeholder="Lab 1"
            className="h-10 border-border text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Status</Label>
          <select
            value={values.status}
            onChange={(e) => set("status", e.target.value as "ACTIVE" | "INACTIVE")}
            className={selectClass}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
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
