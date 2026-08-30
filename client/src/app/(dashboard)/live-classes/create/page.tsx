"use client";

import { Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useScheduleLiveClassMutation } from "@/features/academic/liveClassesApi";

import { EMPTY_LIVE_CLASS, LiveClassForm, type LiveClassFormValues } from "../components/live-class-form";

export default function CreateLiveClassPage() {
  const router = useRouter();
  const [scheduleLiveClass, { isLoading }] = useScheduleLiveClassMutation();

  const [values, setValues] = React.useState<LiveClassFormValues>(EMPTY_LIVE_CLASS);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!values.batchId || !values.title || !values.startAt || !values.endAt) {
      setError("All fields are required.");
      return;
    }

    try {
      await scheduleLiveClass({
        batchId: values.batchId,
        topic: values.title,
        startTime: new Date(values.startAt).toISOString(),
        endTime: new Date(values.endAt).toISOString(),
        // Omitted rather than sent empty: on create there is no previous link
        // to clear, and the API rejects an empty string as an invalid URL.
        ...(values.joinUrl.trim() ? { joinUrl: values.joinUrl.trim() } : {}),
      }).unwrap();
      toast.success("Live class scheduled.");
      router.push("/live-classes");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to schedule live class.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/live-classes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Live Classes
        </Link>
        <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
          <Radio className="h-6 w-6 text-primary" />
          Schedule Live Class
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Set up a live session for a batch. Video hosting isn&apos;t wired up yet. This
          schedules the session record.
        </p>
      </div>

      <Card className="w-full rounded-3xl border border-border bg-card p-6">
        <LiveClassForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/live-classes")}
          isSaving={isLoading}
          submitLabel="Schedule"
          error={error}
        />
      </Card>
    </div>
  );
}
