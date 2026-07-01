"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { useAppSelector } from "@/store/hooks";

import { StudentHomeworkView } from "./StudentHomeworkView";
import { TeacherHomeworkView } from "./TeacherHomeworkView";

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
    return <TeacherHomeworkView />;
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
      <p className="font-bold">Access Denied / Role Not Recognized</p>
      <p className="mt-1">Please verify your role assignments with your administrator.</p>
    </div>
  );
}
