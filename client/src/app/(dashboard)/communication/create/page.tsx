"use client";

import { AlertCircle, ArrowLeft, Info, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateBroadcastMutation } from "@/features/dashboard/dashboardApi";

export default function CreateBroadcastPage() {
  const router = useRouter();
  const [createBroadcast, { isLoading: sending }] = useCreateBroadcastMutation();

  const [broadcastType, setBroadcastType] = React.useState("Announcement");
  const [broadcastTitle, setBroadcastTitle] = React.useState("");
  const [broadcastContent, setBroadcastContent] = React.useState("");
  const [broadcastSender, setBroadcastSender] = React.useState("Admin Console");
  const [formError, setFormError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastContent) {
      setFormError("Title and Content are required.");
      return;
    }

    try {
      await createBroadcast({
        type: broadcastType,
        title: broadcastTitle,
        content: broadcastContent,
        sender: broadcastSender,
        status: "SENT", // Mocking default success status in pipeline
        recipientCount: Math.floor(Math.random() * 50) + 12, // Mocking recipient distribution
      }).unwrap();
      router.push("/communication");
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to dispatch broadcast alert.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/communication"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Communication
        </Link>
        <h1 className="font-display flex items-center gap-1.5 text-xl font-bold tracking-tight text-foreground">
          <Send className="h-5 w-5 text-foreground" />
          Compose Communication Broadcast
        </h1>
        <p className="text-xs text-muted-foreground">
          Draft a notification to dispatch across school communication channels.
        </p>
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        {formError && (
          <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Channel Type
              </Label>
              <select
                value={broadcastType}
                onChange={(e) => setBroadcastType(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              >
                <option value="Announcement">Announcement</option>
                <option value="SMS Alert">SMS Alert</option>
                <option value="Email Broadcast">Email Broadcast</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Sender Name
              </Label>
              <Input
                value={broadcastSender}
                onChange={(e) => setBroadcastSender(e.target.value)}
                placeholder="Admin Console"
                className="h-10 border-border text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Title / Subject
            </Label>
            <Input
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Fall Semester 2026 Registration Open"
              className="h-10 border-border text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Content Message
            </Label>
            <textarea
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="Registration is now officially open for the new semester. Please review updated program logs."
              className="min-h-[100px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-2 rounded-xl border border-border bg-muted/50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-[9px] leading-normal text-muted-foreground">
              Triggering this broadcast will store the record in the central databases and queue
              dispatchers for SMTP email servers and SMS gateway systems.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/communication")}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending}
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Dispatching..." : "Send Broadcast"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
