"use client";

import { Mail, MessageSquare, Plus, Radio } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGetBroadcastsQuery } from "@/features/dashboard/dashboardApi";

export default function CommunicationPage() {
  const { data: broadcastsData, isLoading } = useGetBroadcastsQuery();

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
            Announcements
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Announce updates, broadcast reminders, and review communications logs.
          </p>
        </div>
        <Button
          asChild
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90 active:scale-98"
        >
          <Link href="/communication/create">
            <Plus className="h-4 w-4" /> New Broadcast
          </Link>
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
              No communication broadcasts logged. Click &quot;New Broadcast&quot; to compose an alert.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
