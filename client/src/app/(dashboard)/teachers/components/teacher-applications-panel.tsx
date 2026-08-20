"use client";

import { ExternalLink, FileText, Loader2, UserCheck, UserX } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type TeacherApplication,
  teacherApplicationResumeUrl,
  type TeacherApplicationStatus,
  useGetTeacherApplicationsQuery,
  useReviewTeacherApplicationMutation,
} from "@/features/teacher/teacherApplicationsApi";

const STATUS_STYLES: Record<TeacherApplicationStatus, string> = {
  PENDING: "border-warning/20 bg-warning/10 text-warning",
  UNDER_REVIEW: "border-primary/20 bg-primary/10 text-primary",
  APPROVED: "border-success/20 bg-success/10 text-success",
  REJECTED: "border-border bg-muted text-muted-foreground",
};

/**
 * The review queue for people asking to teach here.
 *
 * Approving is the only way a TEACHER role gets granted through self-signup,
 * so this panel is a gate, not a listing — it is deliberately on the teachers
 * page rather than tucked into a settings screen, next to the registry it
 * feeds.
 */
export function TeacherApplicationsPanel() {
  const [showAll, setShowAll] = React.useState(false);
  const { data, isLoading } = useGetTeacherApplicationsQuery(
    showAll ? { limit: 50 } : { limit: 50, status: "PENDING" },
  );

  const applications = data?.items ?? [];

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center rounded-2xl border border-border bg-card p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  // Nothing waiting and nothing asked for: stay out of the way rather than
  // occupying half the page with an empty state.
  if (applications.length === 0 && !showAll) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3">
        <p className="text-[11px] text-muted-foreground">No teaching applications waiting.</p>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
        >
          View reviewed
        </button>
      </div>
    );
  }

  return (
    <Card className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
            Teaching applications
          </h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Approving grants the TEACHER role and creates the profile. Read the CV first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="shrink-0 cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
        >
          {showAll ? "Waiting only" : "View all"}
        </button>
      </div>

      {applications.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">
          No applications yet.
        </p>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ApplicationRow({ application }: { application: TeacherApplication }) {
  const [reviewApplication, { isLoading }] = useReviewTeacherApplicationMutation();
  const [employeeCode, setEmployeeCode] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const isDecided = application.status === "APPROVED" || application.status === "REJECTED";

  const decide = async (status: "APPROVED" | "REJECTED") => {
    if (
      status === "APPROVED" &&
      !confirm(
        `Approve ${application.fullName}? This grants the TEACHER role, which can see student names, attendance and grades.`,
      )
    ) {
      return;
    }
    try {
      await reviewApplication({
        id: application.id,
        status,
        reviewNotes: notes.trim() || undefined,
        employeeCode: status === "APPROVED" && employeeCode.trim() ? employeeCode.trim() : undefined,
      }).unwrap();
      toast.success(status === "APPROVED" ? "Teacher approved." : "Application rejected.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not record that decision.");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-semibold text-foreground">{application.fullName}</p>
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[application.status]}`}
            >
              {application.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {application.user.email}
            {application.phone ? ` · ${application.phone}` : ""}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {application.specialization || "No specialism given"}
            {application.yearsExperience != null
              ? ` · ${application.yearsExperience} yrs teaching`
              : ""}
          </p>
        </div>

        {/*
          A normal link, opened in a new tab: the API answers with a redirect to
          a short-lived signed URL (or streams the PDF under local storage), and
          neither belongs in the RTK cache.
        */}
        <a
          href={teacherApplicationResumeUrl(application.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-accent"
        >
          <FileText className="h-3.5 w-3.5" />
          {application.resumeFile.originalName.length > 24
            ? "Open CV"
            : application.resumeFile.originalName}
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </a>
      </div>

      {application.bio && (
        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {application.bio}
        </p>
      )}

      {isDecided ? (
        <p className="mt-3 border-t border-border pt-3 text-[10px] text-muted-foreground">
          {application.status === "APPROVED" ? "Approved" : "Rejected"}
          {application.reviewedBy
            ? ` by ${application.reviewedBy.firstName} ${application.reviewedBy.lastName}`
            : ""}
          {application.reviewedAt
            ? ` on ${new Date(application.reviewedAt).toLocaleDateString()}`
            : ""}
          {application.reviewNotes ? ` — ${application.reviewNotes}` : ""}
        </p>
      ) : (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="Employee code (optional)"
              className="h-9 border-border text-xs"
            />
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal note (not shown to them)"
              className="h-9 border-border text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => decide("APPROVED")}
              disabled={isLoading}
              className="h-9 flex-1 cursor-pointer gap-1.5 rounded-xl bg-foreground text-xs font-semibold text-background hover:bg-foreground/90"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              onClick={() => decide("REJECTED")}
              disabled={isLoading}
              variant="outline"
              className="h-9 flex-1 cursor-pointer gap-1.5 rounded-xl text-xs font-semibold"
            >
              <UserX className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
