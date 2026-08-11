"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetUsersQuery } from "@/features/dashboard/dashboardApi";

export interface StudentProfileFormValues {
  fullName: string;
  userId: string;
  birthDate: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "GRADUATED";
}

export const EMPTY_STUDENT_PROFILE: StudentProfileFormValues = {
  fullName: "",
  userId: "",
  birthDate: "",
  gender: "MALE",
  status: "ACTIVE",
};

interface StudentProfileFormProps {
  values: StudentProfileFormValues;
  onChange: (next: StudentProfileFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  error?: string;
  /** The user account link is fixed once the profile exists. */
  lockUserAccount?: boolean;
}

const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";
const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none";

/** Shared by /students/create and /students/[id] so both routes stay a single form definition. */
export function StudentProfileForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  error,
  lockUserAccount,
}: StudentProfileFormProps) {
  const { data: usersData } = useGetUsersQuery();

  const set = <K extends keyof StudentProfileFormValues>(
    key: K,
    value: StudentProfileFormValues[K],
  ) => onChange({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-1">
        <Label className={labelClass}>Full Name</Label>
        <Input
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          placeholder="Charlotte Harris"
          className="h-10 border-border text-xs"
          required
        />
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Link System User Account</Label>
        <select
          value={values.userId}
          onChange={(e) => set("userId", e.target.value)}
          className={selectClass}
          required
          disabled={lockUserAccount}
        >
          <option value="" disabled>
            Select System User
          </option>
          {(usersData?.items ?? []).map((u: any) => (
            <option key={u.id} value={u.id}>
              {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()} ({u.email})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClass}>Birth Date</Label>
          <Input
            type="date"
            value={values.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
            className="h-10 border-border text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Gender</Label>
          <select
            value={values.gender}
            onChange={(e) => set("gender", e.target.value as StudentProfileFormValues["gender"])}
            className={selectClass}
          >
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Status</Label>
        <select
          value={values.status}
          onChange={(e) => set("status", e.target.value as StudentProfileFormValues["status"])}
          className={selectClass}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="GRADUATED">GRADUATED</option>
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
          className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
