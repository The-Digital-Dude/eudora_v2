"use client";

import { AlertCircle, Info,Mail, MessageSquare, Plus, Radio, Send } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
  useCreateBroadcastMutation,
  useGetBroadcastsQuery,
} from "@/features/dashboard/dashboardApi";

export default function CommunicationPage() {
  // RTK Queries & Mutations
  const { data: broadcastsData, isLoading } = useGetBroadcastsQuery();
  const [createBroadcast, { isLoading: sending }] = useCreateBroadcastMutation();

  // Modal Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");

  // Form States
  const [broadcastType, setBroadcastType] = useState("Announcement");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastSender, setBroadcastSender] = useState("Admin Console");

  const handleOpenDialog = () => {
    setBroadcastType("Announcement");
    setBroadcastTitle("");
    setBroadcastContent("");
    setBroadcastSender("Admin Console");
    setFormError("");
    setIsDialogOpen(true);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
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
      setIsDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to dispatch broadcast alert.");
    }
  };

  // Metrics
  const logsList = broadcastsData?.items || [];
  const totalDispatched = logsList.length;
  const smsCount = logsList.filter((l: any) => l.type === "SMS Alert").length;
  const emailCount = logsList.filter((l: any) => l.type === "Email Broadcast").length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Communication & Broadcasts
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Announce updates, broadcast reminders, and review communications logs.
          </p>
        </div>
        <Button
          onClick={handleOpenDialog}
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-white shadow-sm hover:bg-foreground/90 active:scale-98"
        >
          <Plus className="h-4 w-4" /> New Broadcast
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              SMS Dispatched
            </span>
            <Radio className="h-4 w-4 text-success" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {isLoading ? "..." : smsCount}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground">Text notifications sent</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Emails Sent
            </span>
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {isLoading ? "..." : emailCount}
          </p>
          <p className="text-[10px] font-semibold text-success">Healthy delivery score</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Total Alerts
            </span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {isLoading ? "..." : totalDispatched}
          </p>
          <p className="text-[10px] text-muted-foreground">Global announcements sent</p>
        </Card>
      </div>

      {/* Logs Card */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-sm font-bold text-foreground">Recent Broadcast Logs</h2>

        <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border bg-muted/50"
              />
            ))
          ) : logsList.length > 0 ? (
            logsList.map((log: any) => (
              <div
                key={log.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-4 transition-all hover:border-border sm:flex-row sm:items-start"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${
                        log.type === "Announcement"
                          ? "border-primary/10 bg-primary/10 text-primary"
                          : log.type === "SMS Alert"
                            ? "border-success/20 bg-success/10 text-success"
                            : "border-primary/20 bg-primary/10 text-primary"
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      ({log.recipientCount} recipients)
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">{log.title}</h3>
                  {log.content && (
                    <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
                      {log.content}
                    </p>
                  )}
                  <p className="pt-1 text-[9px] font-medium text-muted-foreground">
                    Dispatched by:{" "}
                    <span className="font-semibold text-foreground">{log.sender}</span> | Sent:{" "}
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    log.status === "SENT"
                      ? "border border-success/20 bg-success/10 text-success"
                      : "border border-warning/20 bg-warning/10 text-warning"
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-xs font-medium text-muted-foreground">
              No communication broadcasts logged. Click "New Broadcast" to compose an alert.
            </p>
          )}
        </div>
      </Card>

      {/* Compose Broadcast Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-1.5 text-base font-bold text-foreground">
              <Send className="h-5 w-5 text-foreground" />
              Compose Communication Broadcast
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Draft a notification to dispatch across school communication channels.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Channel Type
                </Label>
                <select
                  value={broadcastType}
                  onChange={(e: any) => setBroadcastType(e.target.value)}
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

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-white shadow-sm hover:bg-foreground/90"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Dispatching..." : "Send Broadcast"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
