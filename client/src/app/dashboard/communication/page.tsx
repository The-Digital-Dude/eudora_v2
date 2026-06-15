"use client";

import React from "react";
import { MessageSquare, Mail, Send, Radio, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CommunicationPage() {
  const mockLogs = [
    { id: 1, type: "Announcement", title: "Fall Semester 2026 Registration Open", sender: "System", date: "2026-06-15" },
    { id: 2, type: "SMS Alert", title: "Attendance Reminder Sent to Parent (Watson)", sender: "Main Campus Branch", date: "2026-06-14" },
    { id: 3, type: "Email Broadcast", title: "Tuition Invoices Generated", sender: "Billing System", date: "2026-06-11" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
          Communication & Broadcasts
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Announce updates, broadcast reminders, and review communications logs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">SMS Broadcasts</span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">3,412</p>
          <p className="text-[10px] text-neutral-400">Total text reminders dispatched</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Email Delivery</span>
            <Mail className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">99.4%</p>
          <p className="text-[10px] text-emerald-600 font-semibold">Healthy server reputation</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Campaigns</span>
            <MessageSquare className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">2 Active</p>
          <p className="text-[10px] text-neutral-400">Enrolment drive broadcasts</p>
        </Card>
      </div>

      <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 font-display">Recent Broadcast Logs</h2>
        <div className="space-y-3">
          {mockLogs.map((log) => (
            <div key={log.id} className="flex justify-between items-center p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-all">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                  log.type === "Announcement"
                    ? "bg-purple-50 text-purple-700 border border-purple-100"
                    : log.type === "SMS Alert"
                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                    : "bg-blue-50 text-blue-700 border border-blue-100"
                }`}>
                  {log.type}
                </span>
                <h3 className="text-xs font-semibold text-neutral-900 mt-1">{log.title}</h3>
                <p className="text-[10px] text-neutral-400">Sender: {log.sender} | Sent: {log.date}</p>
              </div>
              <button className="p-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-500 hover:text-neutral-950 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
