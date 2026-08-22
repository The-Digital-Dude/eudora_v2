"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { useAppSelector } from "@/store/hooks";

import { CourseHomeworkReview } from "./CourseHomeworkReview";
import { StudentHomeworkView } from "./StudentHomeworkView";
import { TeacherHomeworkView } from "./TeacherHomeworkView";

/**
 * Homework reaches a teacher two ways, and they are genuinely different
 * shapes: set for a cohort with a shared deadline, or authored into a course
 * as a checkpoint a self-paced learner works through alone. Until checkpoints
 * existed there was only one, so this view had no need to ask.
 */
function TeacherHomeworkScopes() {
  const [scope, setScope] = React.useState<"cohort" | "course">("cohort");

  return (
    <div className="space-y-4">
      <div className="bg-muted inline-flex gap-1 rounded-xl p-1">
        {(
          [
            ["cohort", "Cohort homework"],
            ["course", "Course checkpoints"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            aria-pressed={scope === value}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              scope === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {scope === "cohort" ? <TeacherHomeworkView /> : <CourseHomeworkReview />}
    </div>
  );
}

export function HomeworkContainer() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const isLoading = !auth.user;

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
  const isStudent = userRoles.includes("USER") && user?.studentProfile;
  const isGuardian = userRoles.includes("GUARDIAN") && user?.guardianProfile;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isStudent || isGuardian) {
    return <StudentHomeworkView />;
  }

  if (isTeacher || isAdmin) {
    return <TeacherHomeworkScopes />;
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
      <p className="font-bold">Access Denied / Role Not Recognized</p>
      <p className="mt-1">Please verify your role assignments with your administrator.</p>
    </div>
  );
}
