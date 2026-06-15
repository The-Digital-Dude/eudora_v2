"use client";

import React from "react";
import { UserPlus, Search, Phone, Mail, ArrowRight, UserCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LeadsPage() {
  const mockLeads = [
    { id: 1, name: "Charlotte Harris", email: "charlotte@example.com", phone: "(555) 019-8832", status: "New", source: "Website Form" },
    { id: 2, name: "Elijah Miller", email: "elijah.m@example.com", phone: "(555) 012-3841", status: "Diagnostic Scheduled", source: "Referral" },
    { id: 3, name: "Aria Watson", email: "aria.w@example.com", phone: "(555) 019-3392", status: "Pending Enrolment", source: "Facebook Ad" },
    { id: 4, name: "Lucas Brooks", email: "lucas.b@example.com", phone: "(555) 015-2831", status: "Enrolled", source: "Walk-in" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
          Leads & Enrolments
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Track interest, onboard prospective students, and coordinate enroled classes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-4 rounded-2xl">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Leads</CardDescription>
          <CardTitle className="text-2xl font-bold text-neutral-900 font-display mt-1">142</CardTitle>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-3.5 h-3.5" /> +15% this week
          </p>
        </Card>
        <Card className="border border-neutral-200 bg-white p-4 rounded-2xl">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Diagnostics Booked</CardDescription>
          <CardTitle className="text-2xl font-bold text-neutral-900 font-display mt-1">28</CardTitle>
          <p className="text-[10px] text-neutral-400 mt-1">Awaiting academic assessment</p>
        </Card>
        <Card className="border border-neutral-200 bg-white p-4 rounded-2xl">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Conversions</CardDescription>
          <CardTitle className="text-2xl font-bold text-neutral-900 font-display mt-1">84%</CardTitle>
          <p className="text-[10px] text-neutral-400 mt-1">Onboarding target reached</p>
        </Card>
      </div>

      <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Active Interest Pipelines</h2>
          <div className="relative w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <Input className="pl-9 h-9 text-xs" placeholder="Search leads..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Name</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Source</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Status</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3">
                    <p className="text-xs font-semibold text-neutral-900">{lead.name}</p>
                    <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {lead.email} | <Phone className="w-3 h-3" /> {lead.phone}
                    </p>
                  </td>
                  <td className="py-3 text-xs text-neutral-500">{lead.source}</td>
                  <td className="py-3 text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      lead.status === "Enrolled"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : lead.status === "New"
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-xs font-semibold text-neutral-900 flex items-center gap-0.5 hover:underline ml-auto">
                      Assess <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
