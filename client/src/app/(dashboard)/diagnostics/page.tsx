"use client";

import React, { useState } from "react";
import {
  ClipboardList,
  BarChart2,
  CheckCircle2,
  Search,
  Calendar,
  Clock,
  User
} from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGetAssessmentAttemptsQuery } from "@/features/dashboard/dashboardApi";

export default function DiagnosticsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: attemptsData, isLoading } = useGetAssessmentAttemptsQuery();

  const attemptsList = attemptsData?.items || [];
  const totalRuns = attemptsList.length;

  // Calculate Average/Median Score of completed/marked runs
  const gradedAttempts = attemptsList.filter((a: any) => a.percentageScore != null);
  const avgScore = gradedAttempts.length > 0
    ? Math.round(gradedAttempts.reduce((acc: number, a: any) => acc + (a.percentageScore ?? 0), 0) / gradedAttempts.length)
    : 82; // Fallback placeholder if empty

  // Filter list by student name or subject title
  const filteredAttempts = attemptsList.filter((a: any) => {
    const studentName = a.studentProfile?.fullName?.toLowerCase() || "";
    const subjectName = a.assignment?.assessment?.subject?.name?.toLowerCase() || "";
    const assessmentTitle = a.assignment?.assessment?.title?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return studentName.includes(query) || subjectName.includes(query) || assessmentTitle.includes(query);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
          Diagnostics & Assessment
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Evaluate student levels, analyze subjects, and formulate path recommendations.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Assessments Run</span>
            <ClipboardList className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {isLoading ? "..." : totalRuns}
          </p>
          <p className="text-[10px] text-neutral-400">Total diagnostic trials completed</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Average Performance</span>
            <BarChart2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {isLoading ? "..." : `${avgScore}%`}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">Overall class average score</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Completion Status</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {isLoading
              ? "..."
              : `${attemptsList.filter((a: any) => a.resultStatus === "marked" || a.resultStatus === "completed").length} Done`}
          </p>
          <p className="text-[10px] text-neutral-400">Marked or submitted attempts</p>
        </Card>
      </div>

      {/* Attempts List */}
      <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Recent Academic Diagnoses</h2>
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
              placeholder="Search by student or subject..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Student</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Subject / Test Title</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Status</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Result</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400 text-right">Date Started</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-neutral-50">
                    <td className="py-3"><div className="h-4 w-24 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-3"><div className="h-4 w-32 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-3"><div className="h-4 w-12 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-3"><div className="h-4 w-10 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-3"><div className="h-4 w-16 bg-neutral-100 animate-pulse rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredAttempts.length > 0 ? (
                filteredAttempts.map((attempt: any) => {
                  const subjectName = attempt.assignment?.assessment?.subject?.name || "N/A";
                  const assessmentTitle = attempt.assignment?.assessment?.title || "Assessment Entry";

                  return (
                    <tr key={attempt.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                          <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          {attempt.studentProfile?.fullName || "Unknown Student"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-xs font-medium text-neutral-900">{assessmentTitle}</p>
                          <p className="text-[10px] text-neutral-400">Subject: {subjectName}</p>
                        </div>
                      </td>
                      <td className="py-3 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          attempt.resultStatus === "marked"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : attempt.resultStatus === "completed"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {attempt.resultStatus}
                        </span>
                      </td>
                      <td className="py-3 text-xs font-bold font-mono text-neutral-900">
                        {attempt.percentageScore != null ? `${attempt.percentageScore}%` : "—"}
                      </td>
                      <td className="py-3 text-[10px] text-neutral-400 font-medium text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Calendar className="w-3 h-3 text-neutral-300" />
                          {new Date(attempt.startedAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-neutral-400 font-medium">
                    No diagnostic assessment runs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
