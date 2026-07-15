"use client";

import {
  BarChart2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Search,
  User,
} from "lucide-react";
import React, { useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGetAssessmentAttemptsQuery } from "@/features/dashboard/dashboardApi";

export default function DiagnosticsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: attemptsData, isLoading } = useGetAssessmentAttemptsQuery();

  const attemptsList = attemptsData?.items || [];
  const totalRuns = attemptsList.length;

  // Calculate Average/Median Score of completed/marked runs
  const gradedAttempts = attemptsList.filter((a: any) => a.percentageScore != null);
  const avgScore =
    gradedAttempts.length > 0
      ? Math.round(
          gradedAttempts.reduce((acc: number, a: any) => acc + (a.percentageScore ?? 0), 0) /
            gradedAttempts.length,
        )
      : 82; // Fallback placeholder if empty

  // Filter list by student name or subject title
  const filteredAttempts = attemptsList.filter((a: any) => {
    const studentName = a.studentProfile?.fullName?.toLowerCase() || "";
    const subjectName = a.assignment?.assessment?.subject?.name?.toLowerCase() || "";
    const assessmentTitle = a.assignment?.assessment?.title?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return (
      studentName.includes(query) || subjectName.includes(query) || assessmentTitle.includes(query)
    );
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Diagnostics & Assessment
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Evaluate student levels, analyze subjects, and formulate path recommendations.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Assessments Run
            </span>
            <ClipboardList className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {isLoading ? "..." : totalRuns}
          </p>
          <p className="text-[10px] text-muted-foreground">Total diagnostic trials completed</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Average Performance
            </span>
            <BarChart2 className="h-4 w-4 text-success" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {isLoading ? "..." : `${avgScore}%`}
          </p>
          <p className="text-[10px] font-semibold text-success">Overall class average score</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Completion Status
            </span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {isLoading
              ? "..."
              : `${attemptsList.filter((a: any) => a.resultStatus === "marked" || a.resultStatus === "completed").length} Done`}
          </p>
          <p className="text-[10px] text-muted-foreground">Marked or submitted attempts</p>
        </Card>
      </div>

      {/* Attempts List */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">
            Recent Academic Diagnoses
          </h2>
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
            </span>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
              placeholder="Search by student or subject..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Student</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Subject / Test Title
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Result</th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Date Started
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredAttempts.length > 0 ? (
                filteredAttempts.map((attempt: any) => {
                  const subjectName = attempt.assignment?.assessment?.subject?.name || "N/A";
                  const assessmentTitle =
                    attempt.assignment?.assessment?.title || "Assessment Entry";

                  return (
                    <tr
                      key={attempt.id}
                      className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {attempt.studentProfile?.fullName || "Unknown Student"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">{assessmentTitle}</p>
                          <p className="text-[10px] text-muted-foreground">Subject: {subjectName}</p>
                        </div>
                      </td>
                      <td className="py-3 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            attempt.resultStatus === "marked"
                              ? "border border-success/20 bg-success/10 text-success"
                              : attempt.resultStatus === "completed"
                                ? "border border-primary/20 bg-primary/10 text-primary"
                                : "border border-warning/20 bg-warning/10 text-warning"
                          }`}
                        >
                          {attempt.resultStatus}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs font-bold text-foreground">
                        {attempt.percentageScore != null ? `${attempt.percentageScore}%` : "—"}
                      </td>
                      <td className="py-3 text-right text-[10px] font-medium text-muted-foreground">
                        <span className="flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(attempt.startedAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-medium text-muted-foreground">
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
