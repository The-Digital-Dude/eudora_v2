"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiveClassSession, useRescheduleLiveClassMutation } from "@/features/academic/liveClassesApi";

import { EMPTY_LIVE_CLASS, LiveClassForm, type LiveClassFormValues } from "./live-class-form";

interface RescheduleLiveClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: LiveClassSession | null;
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not an ISO string.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RescheduleLiveClassDialog({
  open,
  onOpenChange,
  session,
}: RescheduleLiveClassDialogProps) {
  const [rescheduleLiveClass, { isLoading }] = useRescheduleLiveClassMutation();

  const [values, setValues] = React.useState<LiveClassFormValues>(EMPTY_LIVE_CLASS);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !session) return;
    setValues({
      classSectionId: session.classSectionId,
      title: session.title,
      startAt: toDatetimeLocalValue(session.scheduledStartAt),
      endAt: toDatetimeLocalValue(session.scheduledEndAt),
    });
    setError(null);
  }, [open, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!session) return;
    if (!values.title || !values.startAt || !values.endAt) {
      setError("All fields are required.");
      return;
    }

    try {
      await rescheduleLiveClass({
        id: session.id,
        body: {
          title: values.title,
          scheduledStartAt: new Date(values.startAt).toISOString(),
          scheduledEndAt: new Date(values.endAt).toISOString(),
        },
      }).unwrap();
      toast.success("Live class rescheduled.");
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to reschedule live class.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule live class</DialogTitle>
          <DialogDescription>
            Update the title or timing for this session.
          </DialogDescription>
        </DialogHeader>
        <LiveClassForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSaving={isLoading}
          submitLabel="Save changes"
          error={error}
          lockClassSection
        />
      </DialogContent>
    </Dialog>
  );
}
