"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Mail,
  Send,
  Radio,
  AlertCircle,
  Plus,
  Info
} from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useGetBroadcastsQuery,
  useCreateBroadcastMutation,
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Communication & Broadcasts
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Announce updates, broadcast reminders, and review communications logs.
          </p>
        </div>
        <Button
          onClick={handleOpenDialog}
          className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> New Broadcast
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">SMS Dispatched</span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {isLoading ? "..." : smsCount}
          </p>
          <p className="text-[10px] text-neutral-400 font-medium">Text notifications sent</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Emails Sent</span>
            <Mail className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {isLoading ? "..." : emailCount}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">Healthy delivery score</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Total Alerts</span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {isLoading ? "..." : totalDispatched}
          </p>
          <p className="text-[10px] text-neutral-400">Global announcements sent</p>
        </Card>
      </div>

      {/* Logs Card */}
      <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 font-display">Recent Broadcast Logs</h2>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-50 animate-pulse rounded-2xl border border-neutral-100" />
            ))
          ) : logsList.length > 0 ? (
            logsList.map((log: any) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-all gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                      log.type === "Announcement"
                        ? "bg-purple-50 text-purple-700 border-purple-100"
                        : log.type === "SMS Alert"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400">
                      ({log.recipientCount} recipients)
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-neutral-900">{log.title}</h3>
                  {log.content && (
                    <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xl">
                      {log.content}
                    </p>
                  )}
                  <p className="text-[9px] text-neutral-400 font-medium pt-1">
                    Dispatched by: <span className="font-semibold text-neutral-700">{log.sender}</span> | Sent: {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                  log.status === "SENT"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {log.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-400 text-center py-8 font-medium">
              No communication broadcasts logged. Click "New Broadcast" to compose an alert.
            </p>
          )}
        </div>
      </Card>

      {/* Compose Broadcast Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display flex items-center gap-1.5">
              <Send className="w-5 h-5 text-neutral-900" />
              Compose Communication Broadcast
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Draft a notification to dispatch across school communication channels.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Channel Type</Label>
                <select
                  value={broadcastType}
                  onChange={(e: any) => setBroadcastType(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
                >
                  <option value="Announcement">Announcement</option>
                  <option value="SMS Alert">SMS Alert</option>
                  <option value="Email Broadcast">Email Broadcast</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sender Name</Label>
                <Input
                  value={broadcastSender}
                  onChange={(e) => setBroadcastSender(e.target.value)}
                  placeholder="Admin Console"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Title / Subject</Label>
              <Input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Fall Semester 2026 Registration Open"
                className="h-10 text-xs border-neutral-200"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Content Message</Label>
              <textarea
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder="Registration is now officially open for the new semester. Please review updated program logs."
                className="w-full min-h-[100px] border border-neutral-200 rounded-xl p-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 placeholder:text-neutral-300"
                required
              />
            </div>

            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 flex gap-2">
              <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-neutral-400 leading-normal">
                Triggering this broadcast will store the record in the central databases and queue dispatchers for SMTP email servers and SMS gateway systems.
              </p>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? "Dispatching..." : "Send Broadcast"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
