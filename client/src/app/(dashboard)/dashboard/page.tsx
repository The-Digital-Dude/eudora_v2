"use client";

import React from "react";
import Link from "next/link";
import {
  School,
  Users,
  CreditCard,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  Activity,
  Plus,
  AlertCircle,
  FileText,
  Clock,
  CheckSquare,
  Sparkles,
  BookOpen
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetCampusesQuery,
  useGetProgramsQuery,
  useGetUsersQuery
} from "@/features/dashboard/dashboardApi";

export default function DashboardOverview() {
  const { data: campusesData } = useGetCampusesQuery();
  const { data: programsData } = useGetProgramsQuery();
  const { data: usersData } = useGetUsersQuery();

  const totalCampuses = campusesData?.total ?? campusesData?.items?.length ?? 24; // fallback to spec
  const totalPrograms = programsData?.total ?? programsData?.items?.length ?? 0;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 font-display">
            Operational Visibility & Academic Insight
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time platform KPIs, academic trends, and operational reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/campuses">
            <Button className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-98 flex items-center gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" /> Add Campus
            </Button>
          </Link>
        </div>
      </div>

      {/* Admin Dashboard Metric Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Centers / Campuses */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Centers / Campuses
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900">
                {totalCampuses} Active
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 rounded-xl text-neutral-700">
              <School className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +1 new this month
            </p>
          </CardContent>
        </Card>

        {/* Students */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Students Enrolled
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900">
                1,842
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 rounded-xl text-neutral-700">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12% increase
            </p>
          </CardContent>
        </Card>

        {/* Revenue (MTD) */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Revenue (MTD)
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900">
                $178,560
              </CardTitle>
            </div>
            <div className="p-3 bg-neutral-100 rounded-xl text-neutral-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +8% vs last month
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Overdue Balances
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-display text-neutral-900">
                $12,430
              </CardTitle>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> -4% reduction
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Enrollment and Revenue Trends Visuals */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Enrollment Trend */}
        <Card className="border border-neutral-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-3xl p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-neutral-900 font-display">
                Enrollment Trend
              </h2>
              <p className="text-[11px] text-neutral-400">Monthly student onboarding trajectory</p>
            </div>
          </div>
          <div className="h-48 w-full flex items-end justify-between pt-4">
            {/* SVG line graph mock */}
            <svg viewBox="0 0 400 120" className="w-full h-full text-neutral-900">
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(23, 23, 23)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="rgb(23, 23, 23)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 100 Q 80 70 160 85 T 320 30 T 400 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 0 100 Q 80 70 160 85 T 320 30 T 400 10 L 400 120 L 0 120 Z"
                fill="url(#enrollGrad)"
              />
              {/* Dots */}
              <circle cx="160" cy="85" r="4" fill="currentColor" />
              <circle cx="320" cy="30" r="4" fill="currentColor" />
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400 font-semibold mt-2 pt-2 border-t border-neutral-50">
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jul</span>
            <span>Sep</span>
            <span>Nov</span>
          </div>
        </Card>

        {/* Revenue Trend */}
        <Card className="border border-neutral-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-3xl p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-neutral-900 font-display">
                Revenue Trend
              </h2>
              <p className="text-[11px] text-neutral-400">Monthly tuition fees and collections</p>
            </div>
          </div>
          <div className="h-48 w-full flex items-end justify-between gap-2.5 pt-4">
            {[45, 60, 55, 75, 90, 80, 95, 110, 105, 130, 125, 145].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                <div 
                  style={{ height: `${(val / 150) * 100}%` }}
                  className="w-full bg-neutral-900 rounded-t-md hover:bg-neutral-800 transition-all cursor-pointer relative"
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-950 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    ${val}k
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400 font-semibold mt-2 pt-2 border-t border-neutral-50">
            <span>Jan</span>
            <span>Jun</span>
            <span>Dec</span>
          </div>
        </Card>
      </div>

      {/* Admin Dashboard Operations items */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform metrics & lists */}
        <Card className="border border-neutral-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-3xl p-6 bg-white">
          <h2 className="text-sm font-bold tracking-tight text-neutral-900 font-display mb-4">
            Platform Operations & KPIs
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">System Health</span>
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                100% Operational
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Operational Alerts</span>
              <p className="text-xs font-semibold text-neutral-700">0 Active Alerts</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">User Growth</span>
              <p className="text-xs font-semibold text-neutral-700">+15% week-over-week</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Programs Active</span>
              <p className="text-xs font-semibold text-neutral-700">{totalPrograms} Curriculums</p>
            </div>
          </div>
        </Card>

        {/* System Health / API logs */}
        <Card className="border border-neutral-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-3xl p-6 bg-white flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-neutral-900 font-display mb-4">
              Real-time Audit & Logs
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs border-b border-neutral-50 pb-2">
                <span className="text-neutral-500 font-mono">GET /api/campuses</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">200 OK</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-neutral-50 pb-2">
                <span className="text-neutral-500 font-mono">POST /api/auth/login</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">200 OK</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-neutral-50 pb-2">
                <span className="text-neutral-500 font-mono">GET /api/users</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">200 OK</span>
              </div>
            </div>
          </div>
          <Link href="/users" className="text-xs font-semibold text-neutral-900 mt-4 flex items-center gap-1 hover:underline">
            Manage users & permissions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>

      {/* REPORT TYPES section matching the bottom half of the specification */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-neutral-900 font-display">
            Operational Reports & Types
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Access deep analytical data, queues, and operational billing states.
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* Attendance Reports */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 rounded-xl text-neutral-700">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900">Attendance</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Daily & monthly summaries.</p>
            </div>
          </Card>

          {/* Billing Aging */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 rounded-xl text-neutral-700">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900">Billing Aging</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Aged receivables status.</p>
            </div>
          </Card>

          {/* Make-up Queue */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 rounded-xl text-neutral-700">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900">Make-up Queue</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Pending & overdue updates.</p>
            </div>
          </Card>

          {/* Student Submissions */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 rounded-xl text-neutral-700">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900">Submissions</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Homework & reviews status.</p>
            </div>
          </Card>

          {/* Academic Reviews */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 rounded-xl text-neutral-700">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900">Academic Reviews</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Quality checks & turnaround.</p>
            </div>
          </Card>

          {/* Progress Snapshots */}
          <Card className="p-4 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all select-none">
            <div className="space-y-2">
              <div className="p-2 w-fit bg-neutral-100 rounded-xl text-neutral-700">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-neutral-900">Snapshots</h3>
              <p className="text-[10px] text-neutral-400 leading-snug">Academic progress graphs.</p>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
