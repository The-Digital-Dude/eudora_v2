"use client";

import { AlertCircle, Check, Loader2, Plus, Trash, Users } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  useEnrollInClassMutation,
  useGetAvailableClassesQuery,
  useGetClassEnrollmentsQuery,
  useRemoveClassEnrollmentMutation,
} from "@/features/parent/parentApi";

interface ClassEnrollmentPanelProps {
  studentProfileId: string;
  childName: string;
}

/**
 * Registrar-adjacent — unlike `CoursePlanPanel`, a class here carries real
 * academic weight (gradebook, attendance, homework, capacity). Only classes
 * staff has explicitly opted in (`isOpenForEnrollment`) ever show up here;
 * most classes at a campus won't.
 */
export function ClassEnrollmentPanel({ studentProfileId, childName }: ClassEnrollmentPanelProps) {
  const { data: available = [], isLoading: isAvailableLoading } = useGetAvailableClassesQuery(
    studentProfileId,
    { skip: !studentProfileId },
  );
  const { data: enrollments = [], isLoading: isEnrolledLoading } = useGetClassEnrollmentsQuery(
    studentProfileId,
    { skip: !studentProfileId },
  );
  const [enrollInClass, { isLoading: isEnrolling }] = useEnrollInClassMutation();
  const [removeClassEnrollment] = useRemoveClassEnrollmentMutation();

  const [error, setError] = React.useState("");
  const [pendingClassId, setPendingClassId] = React.useState("");

  const enrollable = available.filter((cls) => !cls.isEnrolled);

  const handleEnroll = async (courseClassId: string) => {
    setError("");
    setPendingClassId(courseClassId);
    try {
      await enrollInClass({ studentProfileId, courseClassId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to enroll in this class.");
    } finally {
      setPendingClassId("");
    }
  };

  const handleRemove = async (enrollmentId: string) => {
    if (!confirm(`Withdraw ${childName} from this class?`)) return;
    setError("");
    try {
      await removeClassEnrollment({ studentProfileId, enrollmentId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to withdraw from this class.");
    }
  };

  const isLoading = isAvailableLoading || isEnrolledLoading;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Check className="h-4 w-4 text-success" />
              {childName}&apos;s classes
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Term-based classes with homework, attendance, and grades.
            </p>

            {enrollments.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Not enrolled in any self-service classes yet.
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {enrollment.courseClass.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {enrollment.courseClass.term.name}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemove(enrollment.id)}
                      variant="outline"
                      className="h-8 shrink-0 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Open for enrollment
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Classes at {childName}&apos;s campus currently accepting self-enrollment.
            </p>

            {enrollable.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {available.length === 0
                  ? "No classes are open for self-enrollment right now."
                  : "Every open class is already in the enrollment list."}
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {enrollable.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{cls.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cls.term.name}
                        {cls.capacity != null ? ` · ${cls._count.enrollments}/${cls.capacity} seats` : ""}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleEnroll(cls.id)}
                      disabled={isEnrolling && pendingClassId === cls.id}
                      variant="outline"
                      className="h-8 shrink-0 gap-1 rounded-lg px-3 text-[10px] font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isEnrolling && pendingClassId === cls.id ? "Enrolling..." : "Enroll"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
