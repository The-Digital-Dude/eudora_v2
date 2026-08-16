"use client";

import { Plus, UserRound, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useAttachCourseTeacherMutation,
  useDetachCourseTeacherMutation,
  useGetCourseTeachersQuery,
} from "@/features/catalog/catalogApi";
import { useGetTeacherProfilesQuery } from "@/features/dashboard/dashboardApi";

/**
 * Teaching staff for a course.
 *
 * This is the answer to "one course, many teachers" — a join table. The Batch
 * (`CourseClass`) concept is separate and exists for live cohorts, each of
 * which carries its own lead teacher.
 */
export function CourseTeachersPanel({ courseId }: { courseId: string }) {
  const { data: assigned } = useGetCourseTeachersQuery(courseId);
  const { data: teacherData } = useGetTeacherProfilesQuery({ limit: 200 });
  const [attach, { isLoading: attaching }] = useAttachCourseTeacherMutation();
  const [detach] = useDetachCourseTeacherMutation();

  const [teacherProfileId, setTeacherProfileId] = React.useState("");
  const [role, setRole] = React.useState("LEAD");

  const assignedIds = new Set(
    (assigned ?? []).map((a) => a.teacherProfile.id),
  );
  const available = (teacherData?.items ?? []).filter(
    (t: { id: string }) => !assignedIds.has(t.id),
  );

  const handleAttach = async () => {
    if (!teacherProfileId) return;
    try {
      await attach({ courseId, teacherProfileId, role }).unwrap();
      setTeacherProfileId("");
      toast.success("Teacher assigned");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to assign teacher.");
    }
  };

  const handleDetach = async (id: string) => {
    try {
      await detach({ courseId, teacherProfileId: id }).unwrap();
      toast.success("Teacher removed");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to remove teacher.");
    }
  };

  return (
    <Card className="max-w-xl space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="space-y-1">
        <h2 className="font-display text-sm font-bold text-foreground">
          Teaching staff
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Who teaches this course. A teacher can be on any number of courses.
        </p>
      </div>

      {assigned?.length ? (
        <ul className="space-y-1.5">
          {assigned.map((entry) => (
            <li
              key={entry.teacherProfile.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/80 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs font-semibold text-foreground">
                  {entry.teacherProfile.fullName}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {entry.role}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleDetach(entry.teacherProfile.id)}
                aria-label={`Remove ${entry.teacherProfile.fullName}`}
                className="shrink-0 cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-[11px] text-muted-foreground">
          No teachers assigned yet.
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <select
          value={teacherProfileId}
          onChange={(e) => setTeacherProfileId(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        >
          <option value="">Select a teacher…</option>
          {available.map((t: { id: string; fullName: string }) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 shrink-0 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
        >
          <option value="LEAD">Lead</option>
          <option value="ASSISTANT">Assistant</option>
        </select>
        <Button
          type="button"
          onClick={handleAttach}
          disabled={!teacherProfileId || attaching}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-3 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </Card>
  );
}
