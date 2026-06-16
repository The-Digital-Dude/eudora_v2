"use client";

import React from "react";
import { ClipboardList, TrendingUp, BarChart2, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DiagnosticsPage() {
  const mockDiagnostics = [
    { id: 1, student: "Charlotte Harris", subject: "Mathematics", score: "88%", date: "2026-06-14", recomm: "Advanced Calculus path" },
    { id: 2, student: "Elijah Miller", subject: "Physics", score: "72%", date: "2026-06-13", recomm: "Intro Mechanics course" },
    { id: 3, student: "Aria Watson", subject: "Chemistry", score: "94%", date: "2026-06-11", recomm: "Organic Chemistry module" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
          Diagnostics & Assessment
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Evaluate student levels, analyze subjects, and formulate path recommendations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Assessments Run</span>
            <ClipboardList className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">128</p>
          <p className="text-[10px] text-neutral-400">Total diagnostic trials completed</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Median Performance</span>
            <BarChart2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">82%</p>
          <p className="text-[10px] text-emerald-600 font-semibold">+2.1% improvement</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Path Recommendations</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">94% Accepted</p>
          <p className="text-[10px] text-neutral-400">Students matched to recommended courses</p>
        </Card>
      </div>

      <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 font-display">Recent Academic Diagnoses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Student</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Subject</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Result</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {mockDiagnostics.map((diag) => (
                <tr key={diag.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 text-xs font-semibold text-neutral-900">{diag.student}</td>
                  <td className="py-3 text-xs text-neutral-500">{diag.subject}</td>
                  <td className="py-3 text-xs font-bold font-mono text-neutral-900">{diag.score}</td>
                  <td className="py-3 text-xs text-neutral-500">{diag.recomm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
