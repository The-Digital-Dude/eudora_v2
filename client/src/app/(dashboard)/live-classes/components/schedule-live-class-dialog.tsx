"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LiveClassSession,
  useRescheduleLiveClassMutation,
  useScheduleLiveClassMutation,
} from "@/features/academic/liveClassesApi";
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";

interface ScheduleLiveClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClassSectionId?: string;
  session?: LiveClassSession | null; // null/undefined = schedule new, set = reschedule existing
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not an ISO string.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleLiveClassDialog({
  open,
  onOpenChange,
  defaultClassSectionId,
  session,
}: ScheduleLiveClassDialogProps) {
  const isEditing = !!session;

  const [scheduleLiveClass, { isLoading: isScheduling }] = useScheduleLiveClassMutation();
  const [rescheduleLiveClass, { isLoading: isRescheduling }] = useRescheduleLiveClassMutation();
  const isLoading = isScheduling || isRescheduling;

  const { data: classSectionsData } = useGetClassSectionsQuery();
  const classSections = classSectionsData?.items || [];

  const [classSectionId, setClassSectionId] = React.useState<string>(
    defaultClassSectionId || "",
  );
  const [title, setTitle] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (session) {
      setClassSectionId(session.classSectionId);
      setTitle(session.title);
      setStartAt(toDatetimeLocalValue(session.scheduledStartAt));
      setEndAt(toDatetimeLocalValue(session.scheduledEndAt));
    } else {
      setClassSectionId(defaultClassSectionId || "");
      setTitle("");
      setStartAt("");
      setEndAt("");
    }
    setErrorMessage(null);
  }, [open, session, defaultClassSectionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!classSectionId || !title || !startAt || !endAt) {
      setErrorMessage("All fields are required.");
      return;
    }

    try {
      if (isEditing && session) {
        await rescheduleLiveClass({
          id: session.id,
          body: {
            title,
            scheduledStartAt: new Date(startAt).toISOString(),
            scheduledEndAt: new Date(endAt).toISOString(),
          },
        }).unwrap();
        toast.success("Live class rescheduled.");
      } else {
        await scheduleLiveClass({
          classSectionId,
          title,
          scheduledStartAt: new Date(startAt).toISOString(),
          scheduledEndAt: new Date(endAt).toISOString(),
        }).unwrap();
        toast.success("Live class scheduled.");
      }
      onOpenChange(false);
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message ||
          (isEditing ? "Failed to reschedule live class." : "Failed to schedule live class."),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Reschedule live class" : "Schedule live class"}</DialogTitle>
          <DialogDescription>
            Set up a live session for a class section. Video hosting isn&apos;t wired up
            yet — this schedules the session record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Class section</Label>
            <Select
              value={classSectionId}
              onValueChange={setClassSectionId}
              disabled={isEditing}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fractions review session"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="live-class-start">Starts at</Label>
              <Input
                id="live-class-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="live-class-end">Ends at</Label>
              <Input
                id="live-class-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          {errorMessage && <p className="text-xs font-medium text-destructive">{errorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Save changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
