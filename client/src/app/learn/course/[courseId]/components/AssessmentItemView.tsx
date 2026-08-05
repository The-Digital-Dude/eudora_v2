"use client";

import { Award, CalendarClock, ClipboardList, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import { useGetAssessmentQuery } from "@/features/assessments/assessmentsApi";
import { useGetMyAssignmentForItemQuery } from "@/features/catalog/catalogApi";
import type { ModuleItem } from "@/features/catalog/catalogApi";

interface AssessmentItemViewProps {
  item: ModuleItem;
}

// A Coursera-style "Practice/Graded Assignment" landing card. Rather than
// re-implementing the question-answering flow inline (risking double
// ownership of the viewport with the existing standalone player), this
// links straight into the already-working /learn/assessments/[assignmentId]
// route once a per-student assignment exists.
export function AssessmentItemView({ item }: AssessmentItemViewProps) {
  const router = useRouter();
  const { data: assessment, isLoading: isLoadingAssessment } = useGetAssessmentQuery(
    item.assessmentId || "",
    { skip: !item.assessmentId },
  );
  const { data: assignmentData, isLoading: isLoadingAssignment } =
    useGetMyAssignmentForItemQuery(item.id);

  if (!item.assessmentId) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        No assessment linked to this item yet.
      </p>
    );
  }

  if (isLoadingAssessment || isLoadingAssignment || !assessment) {
    return <p className="p-8 text-sm text-muted-foreground">Loading assignment...</p>;
  }

  const assignment = assignmentData?.assignment ?? null;

  return (
    <div className="mx-auto max-w-xl p-8">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
        {assessment.countsTowardGrade ? "Graded Assignment" : "Practice Assignment"}
      </p>
      <h2 className="mb-2 text-xl font-bold text-foreground">{item.title}</h2>
      {assessment.description && (
        <p className="mb-6 text-sm text-muted-foreground">{assessment.description}</p>
      )}

      <div className="mb-6 rounded-2xl border border-border bg-muted/30 p-4 space-y-2.5">
        {assignment?.dueAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Due {new Date(assignment.dueAt).toLocaleString()}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Repeat className="h-3.5 w-3.5" />
          {assessment.maxAttempts ? `${assessment.maxAttempts} attempt(s) allowed` : "Unlimited attempts"}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Award className="h-3.5 w-3.5" />
          {assessment.totalMarks} marks · {assessment.estimatedDurationMinutes} min
        </div>
      </div>

      {assignment ? (
        <button
          onClick={() => router.push(`/learn/assessments/${assignment.id}`)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <ClipboardList className="h-4 w-4" /> Start assignment
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">
          This assignment hasn&apos;t been assigned to you yet — check with your teacher.
        </p>
      )}
    </div>
  );
}
