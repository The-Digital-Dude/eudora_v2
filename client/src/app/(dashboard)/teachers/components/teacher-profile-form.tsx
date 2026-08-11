"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TeacherProfileFormValues {
  email: string;
  firstName: string;
  lastName: string;
  /** Only used in edit mode — the account already exists by then. */
  fullName: string;
  employeeCode: string;
  phone: string;
  specialization: string;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}

export const EMPTY_TEACHER_PROFILE: TeacherProfileFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  fullName: "",
  employeeCode: "",
  phone: "",
  specialization: "",
  status: "ACTIVE",
};

interface TeacherProfileFormProps {
  values: TeacherProfileFormValues;
  onChange: (next: TeacherProfileFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string;
  /** Create also provisions the User account (email/first/last); edit only renames the profile. */
  mode: "create" | "edit";
}

const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";
const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none";

/** Shared by /teachers/create and /teachers/[id] so both routes stay a single form definition. */
export function TeacherProfileForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
  mode,
}: TeacherProfileFormProps) {
  const set = <K extends keyof TeacherProfileFormValues>(
    key: K,
    value: TeacherProfileFormValues[K],
  ) => onChange({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {mode === "create" ? (
        <>
          <div className="space-y-1">
            <Label className={labelClass}>Email Address</Label>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="prof.turing@eudora.app"
              className="h-10 border-border text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={labelClass}>First Name</Label>
              <Input
                value={values.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Alan"
                className="h-10 border-border text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className={labelClass}>Last Name</Label>
              <Input
                value={values.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Turing"
                className="h-10 border-border text-xs"
                required
              />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-1">
          <Label className={labelClass}>Full Name</Label>
          <Input
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className="h-10 border-border text-xs"
            required
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Employee Code</Label>
          <Input
            value={values.employeeCode}
            onChange={(e) => set("employeeCode", e.target.value)}
            placeholder="EMP-012"
            className="h-10 border-border text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Contact Number</Label>
          <Input
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 019-3832"
            className="h-10 border-border text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Academic Specialization</Label>
        <Input
          value={values.specialization}
          onChange={(e) => set("specialization", e.target.value)}
          placeholder="Computer Science, Calculus, Chemistry"
          className="h-10 border-border text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Status</Label>
        <select
          value={values.status}
          onChange={(e) => set("status", e.target.value as TeacherProfileFormValues["status"])}
          className={selectClass}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="ON_LEAVE">ON LEAVE</option>
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
          className="h-10 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
