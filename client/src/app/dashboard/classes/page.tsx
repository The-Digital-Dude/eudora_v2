"use client";

import React from "react";
import { Calendar, Users, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClassesPage() {
  const mockClasses = [
    { id: 1, name: "Intro to Algorithms (Section A)", teacher: "Dr. Alan Turing", students: 18, time: "Monday 10:00 AM" },
    { id: 2, name: "Advanced Database Design", teacher: "Prof. Grace Hopper", students: 15, time: "Tuesday 02:00 PM" },
    { id: 3, name: "Calculus III", teacher: "Dr. Katherine Johnson", students: 22, time: "Thursday 09:00 AM" }
  ];

  const mockMakeupQueue = [
    { id: 1, student: "Charlotte Harris", class: "Intro to Algorithms", originalDate: "2026-06-12", reason: "Medical Leave", status: "Awaiting Action" },
    { id: 2, student: "Elijah Miller", class: "Calculus III", originalDate: "2026-06-15", reason: "Family Event", status: "Scheduled" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
          Classes, Attendance & Make-ups
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Schedule classrooms, record attendance logs, and manage make-up sessions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Classes Metrics */}
        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Classes</span>
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">42</p>
          <p className="text-[10px] text-neutral-400">Scheduled for current semester</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Attendance Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">96.8%</p>
          <p className="text-[10px] text-emerald-600 font-semibold">+0.4% from last term</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Make-ups Pending</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">8 Requests</p>
          <p className="text-[10px] text-neutral-400">Awaiting schedule matching</p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Classes List */}
        <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Class Schedule Logs</h2>
          <div className="space-y-3">
            {mockClasses.map((c) => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-all">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900">{c.name}</h3>
                  <p className="text-[10px] text-neutral-400">Instructor: {c.teacher} | Time: {c.time}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                  <Users className="w-3.5 h-3.5" />
                  {c.students} Registered
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Make-up Queue */}
        <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Make-up Request Queue</h2>
          <div className="space-y-3">
            {mockMakeupQueue.map((m) => (
              <div key={m.id} className="flex justify-between items-center p-3 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-all">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900">{m.student}</h3>
                  <p className="text-[10px] text-neutral-400">Class: {m.class} | Date: {m.originalDate}</p>
                  <p className="text-[9px] text-amber-600 font-medium">Reason: {m.reason}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  m.status === "Scheduled"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
