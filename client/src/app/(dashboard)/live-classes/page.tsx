"use client";

import { Plus, Radio, Users } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiveClassSession, useGetLiveClassesQuery } from "@/features/academic/liveClassesApi";
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";
import { useAppSelector } from "@/store/hooks";

import { LiveClassRow } from "./components/live-class-row";
import { ScheduleLiveClassDialog } from "./components/schedule-live-class-dialog";

const STATUS_OPTIONS = ["all", "SCHEDULED", "LIVE", "ENDED", "CANCELLED"] as const;

export default function LiveClassesPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  const userRoles = React.useMemo<string[]>(() => {
    if (!user) return [];
    const rolesList: string[] = [];
    if (user.role) rolesList.push(user.role);
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (typeof r === "string") rolesList.push(r);
        else if (r?.name) rolesList.push(r.name);
        else if (r?.role?.name) rolesList.push(r.role?.name);
      });
    }
    return rolesList;
  }, [user]);

  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  const isTeacher = userRoles.includes("TEACHER");

  // Teachers default to "my sessions" — a convenience default, not a security
  // boundary (the backend doesn't scope by ownership either).
  const [showAllTeachers, setShowAllTeachers] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [classSectionFilter, setClassSectionFilter] = React.useState<string>("all");

  const { data: classSectionsData } = useGetClassSectionsQuery();
  const classSections = classSectionsData?.items || [];

  const { data: sessions, isLoading } = useGetLiveClassesQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    classSectionId: classSectionFilter === "all" ? undefined : classSectionFilter,
    teacherUserId: isTeacher && !isAdmin && !showAllTeachers ? user?.id : undefined,
  });

  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<LiveClassSession | null>(null);

  const canSchedule = isAdmin || isTeacher;

  const handleReschedule = (session: LiveClassSession) => {
    setEditingSession(session);
    setScheduleDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setScheduleDialogOpen(open);
    if (!open) setEditingSession(null);
  };

  const sessionList = sessions || [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Live Classes
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Schedule and run live class sessions for your sections.
          </p>
        </div>
        {canSchedule && (
          <Button onClick={() => setScheduleDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Schedule live class
          </Button>
        )}
      </div>

      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                  statusFilter === option
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {option === "all" ? "All" : option.charAt(0) + option.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isTeacher && !isAdmin && (
              <button
                onClick={() => setShowAllTeachers((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                  showAllTeachers
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Users className="h-3 w-3" />
                {showAllTeachers ? "All teachers" : "My sessions"}
              </button>
            )}
            <Select value={classSectionFilter} onValueChange={setClassSectionFilter}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Class section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All class sections</SelectItem>
                {classSections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Session
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Teacher
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Schedule
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Status
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3" colSpan={5}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : sessionList.length > 0 ? (
                sessionList.map((session) => (
                  <LiveClassRow
                    key={session.id}
                    session={session}
                    onReschedule={handleReschedule}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      icon={<Radio className="h-8 w-8" />}
                      title="No live classes scheduled"
                      description="Schedule a live class to get started."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ScheduleLiveClassDialog
        open={scheduleDialogOpen}
        onOpenChange={handleOpenChange}
        session={editingSession}
      />
    </div>
  );
}
