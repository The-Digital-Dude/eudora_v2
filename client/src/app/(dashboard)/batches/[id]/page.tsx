"use client";

import { CalendarClock, Loader2, Trash2, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DayOfWeek, PlannedSession } from "@/features/dashboard/dashboardApi";
import {
  useDeleteBatchSessionMutation,
  useGenerateBatchSessionsMutation,
  useGetBatchesQuery,
  useGetBatchSessionsQuery,
  usePreviewBatchSessionsMutation,
  useUpdateMeetingPatternMutation,
} from "@/features/dashboard/dashboardApi";

const DAYS: { value: DayOfWeek; short: string }[] = [
  { value: "MONDAY", short: "Mon" },
  { value: "TUESDAY", short: "Tue" },
  { value: "WEDNESDAY", short: "Wed" },
  { value: "THURSDAY", short: "Thu" },
  { value: "FRIDAY", short: "Fri" },
  { value: "SATURDAY", short: "Sat" },
  { value: "SUNDAY", short: "Sun" },
];

/** 960 -> "16:00", for a time input. */
function minutesToTime(mins: number | null): string {
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function BatchSchedulePage() {
  const params = useParams();
  const batchId = params.id as string;

  // The list endpoint is already cached from /batches; picking the row out of
  // it avoids a detail endpoint that would exist only for this page.
  const { data: batchesData, isLoading: isLoadingBatch } = useGetBatchesQuery({
    limit: 100,
  });
  const batch = (batchesData?.items ?? []).find((b) => b.id === batchId);

  const { data: sessions = [], isLoading: isLoadingSessions } =
    useGetBatchSessionsQuery(batchId);

  const [updatePattern, { isLoading: isSavingPattern }] =
    useUpdateMeetingPatternMutation();
  const [previewSessions, { isLoading: isPreviewing }] =
    usePreviewBatchSessionsMutation();
  const [generateSessions, { isLoading: isGenerating }] =
    useGenerateBatchSessionsMutation();
  const [deleteSession] = useDeleteBatchSessionMutation();

  const [days, setDays] = React.useState<DayOfWeek[]>([]);
  const [startTime, setStartTime] = React.useState("");
  const [duration, setDuration] = React.useState("60");
  const [topic, setTopic] = React.useState("");
  const [plan, setPlan] = React.useState<PlannedSession[] | null>(null);

  // Seed the form once the batch arrives.
  React.useEffect(() => {
    if (!batch) return;
    setDays(batch.meetingDays ?? []);
    setStartTime(minutesToTime(batch.meetingStartMinutes));
    setDuration(
      batch.meetingDurationMinutes != null
        ? String(batch.meetingDurationMinutes)
        : "60",
    );
  }, [batch]);

  const toggleDay = (day: DayOfWeek) =>
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const handleSavePattern = async () => {
    const mins = timeToMinutes(startTime);
    const dur = parseInt(duration, 10);
    if (days.length === 0) return toast.error("Pick at least one meeting day.");
    if (mins == null) return toast.error("Enter a start time.");
    if (!Number.isFinite(dur) || dur < 5) {
      return toast.error("Duration must be at least 5 minutes.");
    }
    try {
      await updatePattern({
        batchId,
        body: {
          meetingDays: days,
          meetingStartMinutes: mins,
          meetingDurationMinutes: dur,
        },
      }).unwrap();
      toast.success("Meeting pattern saved.");
      setPlan(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save the pattern.");
    }
  };

  const handlePreview = async () => {
    try {
      const result = await previewSessions({
        batchId,
        body: topic.trim() ? { topic: topic.trim() } : {},
      }).unwrap();
      setPlan(result.planned);
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not work out a schedule.");
      setPlan(null);
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generateSessions({
        batchId,
        body: topic.trim() ? { topic: topic.trim() } : {},
      }).unwrap();
      toast.success(
        result.skipped > 0
          ? `Created ${result.created} session(s); ${result.skipped} date(s) already had one.`
          : `Created ${result.created} session(s).`,
      );
      setPlan(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to generate sessions.");
    }
  };

  const handleDelete = async (sessionId: string, attendance: number) => {
    if (attendance > 0) {
      return toast.error(
        "This session has attendance recorded. Cancel it instead of deleting.",
      );
    }
    if (!confirm("Delete this session?")) return;
    try {
      await deleteSession({ batchId, sessionId }).unwrap();
      toast.success("Session deleted.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete the session.");
    }
  };

  if (isLoadingBatch) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Batch not found.</p>
        <Link href="/batches" className="text-xs font-bold text-primary hover:underline">
          Back to batches
        </Link>
      </div>
    );
  }

  const newCount = plan?.filter((p) => !p.alreadyScheduled).length ?? 0;
  const skipCount = plan?.filter((p) => p.alreadyScheduled).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/batches"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to batches
        </Link>
        <h1 className="font-display mt-1 flex items-center gap-2 text-xl font-bold text-foreground">
          <CalendarClock className="h-5 w-5 text-primary" />
          {batch.name}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {batch.code}
          {batch.course && ` · ${batch.course.title}`} ·{" "}
          {batch._count?.enrollments ?? 0} enrolled
        </p>
      </div>

      <Card className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display mb-1 text-sm font-bold text-foreground">
          Weekly meeting pattern
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          A rule, not a schedule. It is used to generate the sessions below. Changing
          it never rewrites meetings that already exist.
        </p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                days.includes(d.value)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {d.short}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Starts at
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="block h-9 rounded-xl border border-border bg-card px-3 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Minutes
            </label>
            <input
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="block h-9 w-24 rounded-xl border border-border bg-card px-3 text-xs"
            />
          </div>
          <Button onClick={handleSavePattern} disabled={isSavingPattern} size="sm">
            {isSavingPattern ? "Saving..." : "Save pattern"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display mb-1 text-sm font-bold text-foreground">
          Generate sessions
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Creates one session per matching day between{" "}
          {batch.startDate ? formatDate(batch.startDate) : "the batch start"} and{" "}
          {batch.endDate ? formatDate(batch.endDate) : "the batch end"}.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Topic for each session (optional)
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Weekly maths session"
              className="block h-9 w-full rounded-xl border border-border bg-card px-3 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={isPreviewing}
          >
            {isPreviewing ? "Working..." : "Preview"}
          </Button>
        </div>

        {plan && (
          <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold text-foreground">
              {newCount} new session{newCount === 1 ? "" : "s"}
              {skipCount > 0 && `, ${skipCount} date${skipCount === 1 ? "" : "s"} already scheduled`}
            </p>
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
              {plan.map((p) => (
                <li
                  key={p.date}
                  className={`text-[11px] ${
                    p.alreadyScheduled
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                >
                  {formatDate(p.date)} · {formatTime(p.startTime)}–{formatTime(p.endTime)}
                </li>
              ))}
            </ul>
            {newCount > 0 && (
              <Button
                size="sm"
                className="mt-3 gap-1.5"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {isGenerating ? "Creating..." : `Create ${newCount} session${newCount === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="rounded-3xl border border-border bg-card p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-sm font-bold text-foreground">
            Scheduled sessions
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {sessions.length}
            </span>
          </h2>
        </div>

        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-6 py-12 text-center text-xs text-muted-foreground">
            No sessions yet. Set a pattern above and generate them.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 px-6 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {s.topic ?? s.moduleItem?.title ?? "Untitled session"}
                    {s.status === "CANCELLED" && (
                      <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold text-destructive">
                        CANCELLED
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(s.date)} · {formatTime(s.startTime)}–
                    {formatTime(s.endTime)}
                    {s.teacher && ` · ${s.teacher.firstName} ${s.teacher.lastName}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {s._count.attendance > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {s._count.attendance}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s.id, s._count.attendance)}
                    aria-label="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
