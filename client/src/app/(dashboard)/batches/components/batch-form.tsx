"use client";

import * as React from "react";
import { toast } from "sonner";

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
import { useGetCoursesQuery } from "@/features/catalog/catalogApi";
import type { Batch, BatchPayload } from "@/features/dashboard/dashboardApi";
import {
  useCreateBatchMutation,
  useGetTeacherProfilesQuery,
  useUpdateBatchMutation,
} from "@/features/dashboard/dashboardApi";

// Radix Select cannot hold an empty-string value, so "not set" needs a sentinel.
const NONE = "__none__";

interface BatchFormProps {
  existing?: Batch | null;
  onDone: () => void;
  onCancel: () => void;
}

/** Date inputs want YYYY-MM-DD; the API speaks ISO. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function BatchForm({ existing, onDone, onCancel }: BatchFormProps) {
  const { data: coursesData } = useGetCoursesQuery({ limit: 100 });
  const { data: teachersData } = useGetTeacherProfilesQuery({ limit: 100 });
  const [createBatch, { isLoading: isCreating }] = useCreateBatchMutation();
  const [updateBatch, { isLoading: isUpdating }] = useUpdateBatchMutation();

  const courses = coursesData?.items ?? [];
  const teachers = teachersData?.items ?? [];

  const [name, setName] = React.useState(existing?.name ?? "");
  const [code, setCode] = React.useState(existing?.code ?? "");
  const [courseId, setCourseId] = React.useState(existing?.courseId ?? NONE);
  const [leadTeacherProfileId, setLeadTeacher] = React.useState(
    existing?.leadTeacherProfileId ?? NONE,
  );
  const [capacity, setCapacity] = React.useState(
    existing?.capacity != null ? String(existing.capacity) : "",
  );
  const [startDate, setStartDate] = React.useState(toDateInput(existing?.startDate));
  const [endDate, setEndDate] = React.useState(toDateInput(existing?.endDate));
  const [enrollmentDeadline, setDeadline] = React.useState(
    toDateInput(existing?.enrollmentDeadline),
  );
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">(
    existing?.status ?? "ACTIVE",
  );
  const [error, setError] = React.useState<string | null>(null);

  const isSaving = isCreating || isUpdating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !code.trim()) {
      setError("Name and code are required.");
      return;
    }
    // Mirrors the server guard so the common case fails without a round trip.
    if (startDate && endDate && endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    const parsedCapacity = capacity.trim() ? parseInt(capacity, 10) : null;
    if (parsedCapacity !== null && (!Number.isFinite(parsedCapacity) || parsedCapacity < 1)) {
      setError("Capacity must be a positive whole number.");
      return;
    }

    const body: BatchPayload = {
      name: name.trim(),
      code: code.trim(),
      courseId: courseId === NONE ? null : courseId,
      leadTeacherProfileId: leadTeacherProfileId === NONE ? null : leadTeacherProfileId,
      capacity: parsedCapacity,
      startDate: startDate || null,
      endDate: endDate || null,
      enrollmentDeadline: enrollmentDeadline || null,
      status,
    };

    try {
      if (existing) {
        await updateBatch({ id: existing.id, body }).unwrap();
        toast.success("Batch updated.");
      } else {
        await createBatch(body).unwrap();
        toast.success("Batch created.");
      }
      onDone();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save batch.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Batch" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ALGO-2026-S1" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Course</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No course</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          A batch with no course can never be sold — checkout finds batches by course.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Lead teacher</Label>
        <Select value={leadTeacherProfileId} onValueChange={setLeadTeacher}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {teachers.map((t: { id: string; fullName: string }) => (
              <SelectItem key={t.id} value={t.id}>
                {t.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">End date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <p className="text-[10px] text-muted-foreground">Live access expires here.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Enrolment deadline</Label>
          <Input
            type="date"
            value={enrollmentDeadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Capacity</Label>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : existing ? "Save changes" : "Create batch"}
        </Button>
      </div>
    </form>
  );
}
