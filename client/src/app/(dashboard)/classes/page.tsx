"use client";

import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetLearningSubjectsQuery } from "@/features/catalog/catalogApi";
import {
  useGetClassSectionsQuery,
  useGetCourseClassesQuery,
  useGetMakeupRequestsQuery,
  useUpdateMakeupRequestMutation,
} from "@/features/dashboard/dashboardApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

import { CourseClassEnrollmentDialog } from "./components/course-class-enrollment-dialog";

const PAGE_SIZE = 20;

export default function ClassesPage() {
  // Class-section list state, held in the URL so a subject-filtered roster view can be shared.
  const { values, setValue } = useListQueryState(
    { search: "", subject: "all", page: 1 },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  const { data: subjects } = useGetLearningSubjectsQuery();
  const { data: sectionsData, isLoading: sectionsLoading } = useGetClassSectionsQuery({
    page: values.page,
    limit: PAGE_SIZE,
    search: values.search || undefined,
    learningSubjectId: values.subject === "all" ? undefined : values.subject,
  });
  const sectionList = sectionsData?.items || [];

  // RTK queries and mutations
  const { data: classesData, isLoading: classesLoading } = useGetCourseClassesQuery();
  const { data: makeupData, isLoading: makeupLoading } = useGetMakeupRequestsQuery();
  const [updateMakeupRequest, { isLoading: updatingMakeup }] = useUpdateMakeupRequestMutation();

  // Dialog state for a class's guardian-enrollment settings
  const [enrollmentDialogClass, setEnrollmentDialogClass] = useState<any>(null);

  // Dialog state for approving makeup request (setting scheduled date)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [formError, setFormError] = useState("");

  const handleOpenApproveDialog = (request: any) => {
    setSelectedRequest(request);
    setScheduledDate("");
    setFormError("");
    setIsApproveDialogOpen(true);
  };

  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setFormError("A scheduled date is required to approve the make-up request.");
      return;
    }

    try {
      await updateMakeupRequest({
        id: selectedRequest.id,
        body: {
          status: "Scheduled",
          scheduledDate: new Date(scheduledDate).toISOString(),
        },
      }).unwrap();
      setIsApproveDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to schedule makeup request.");
    }
  };

  const handleDeclineRequest = async (id: string) => {
    if (confirm("Are you sure you want to decline this make-up request?")) {
      try {
        await updateMakeupRequest({
          id,
          body: {
            status: "Declined",
          },
        }).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to decline makeup request.");
      }
    }
  };

  // Metrics calculations
  const classList = classesData?.items || [];
  const activeClassesCount = classList.length;

  const makeupList = makeupData?.items || [];
  const pendingMakeupsCount = makeupList.filter((m: any) => m.status === "Awaiting Action").length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Classes, Attendance & Make-ups
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Schedule classrooms, record attendance logs, and manage make-up sessions.
          </p>
        </div>
        <Button
          asChild
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90"
        >
          <Link href="/classes/create">
            <Plus className="h-4 w-4" /> New Class Section
          </Link>
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Active Classes
            </span>
            <Calendar className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {classesLoading ? "..." : activeClassesCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Scheduled course classes</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Attendance Rate
            </span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">96.8%</p>
          <p className="text-[10px] font-semibold text-success">+0.4% from last term</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Make-ups Pending
            </span>
            <AlertTriangle
              className={`h-4 w-4 ${pendingMakeupsCount > 0 ? "animate-pulse text-warning" : "text-muted-foreground/50"}`}
            />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {makeupLoading ? "..." : `${pendingMakeupsCount} Requests`}
          </p>
          <p className="text-[10px] text-muted-foreground">Awaiting schedule matching</p>
        </Card>
      </div>

      {/* Class Sections — the roster unit attendance, timetable and gradebook all hang off. */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Class Sections</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              value={values.subject}
              onChange={(e) => setValue("subject", e.target.value)}
              className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Subjects</option>
              <option value="none">No subject tagged</option>
              {(subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder="Search sections by name, code or room..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sectionsLoading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-border bg-muted/50"
              />
            ))
          ) : sectionList.length > 0 ? (
            sectionList.map((section) => (
              <Link
                key={section.id}
                href={`/classes/${section.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-3.5 transition-all hover:border-foreground/20 hover:bg-muted"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-xs font-semibold text-foreground">{section.name}</h3>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                    {section.code}
                    {section.class ? ` · ${section.class}` : ""}
                    {section.classroom ? ` · ${section.classroom}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {section.learningSubject ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                      <Layers className="h-3 w-3" />
                      {section.learningSubject.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      No subject
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      section.status === "ACTIVE"
                        ? "border border-success/20 bg-success/10 text-success"
                        : "border border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {section.status}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className="py-6 text-center text-xs font-medium text-muted-foreground">
              {values.search || values.subject !== "all"
                ? "No class sections match these filters."
                : "No class sections yet. Create one to start building rosters."}
            </p>
          )}
        </div>

        <ListPagination
          page={values.page}
          pageSize={PAGE_SIZE}
          total={sectionsData?.total ?? 0}
          onPageChange={(next) => setValue("page", next)}
          label="section"
        />
      </Card>

      {/* Lists Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Classes List */}
        <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-sm font-bold text-foreground">Class Schedule Logs</h2>
          <div className="max-h-[350px] space-y-3 overflow-y-auto pr-1">
            {classesLoading ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl border border-border bg-muted/50"
                />
              ))
            ) : classList.length > 0 ? (
              classList.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-3.5 transition-all hover:border-border"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">{c.name}</h3>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                      Code: {c.code}
                    </p>
                    {c.term && (
                      <p className="text-[9px] text-muted-foreground">
                        Term: {c.term.name}{" "}
                        {c.term.academicYear ? `(${c.term.academicYear.name})` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.isOpenForEnrollment && (
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                        Open enrollment
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        c.status === "ACTIVE"
                          ? "border border-success/20 bg-success/10 text-success"
                          : "border border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.status}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEnrollmentDialogClass(c)}
                      className="h-7 w-7 cursor-pointer rounded-lg p-0"
                      title="Enrollment settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs font-medium text-muted-foreground">
                No course classes found.
              </p>
            )}
          </div>
        </Card>

        <CourseClassEnrollmentDialog
          courseClass={enrollmentDialogClass}
          open={!!enrollmentDialogClass}
          onOpenChange={(open) => {
            if (!open) setEnrollmentDialogClass(null);
          }}
        />

        {/* Make-up Queue */}
        <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-sm font-bold text-foreground">Make-up Request Queue</h2>
          <div className="max-h-[350px] space-y-3 overflow-y-auto pr-1">
            {makeupLoading ? (
              [...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl border border-border bg-muted/50"
                />
              ))
            ) : makeupList.length > 0 ? (
              makeupList.map((m: any) => (
                <div
                  key={m.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-3.5 transition-all hover:border-border sm:flex-row sm:items-center"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">
                      {m.studentProfile?.fullName || "Student"}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Class:{" "}
                      <span className="font-semibold text-muted-foreground">
                        {m.courseClass?.name || "N/A"}
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Clock className="h-3 w-3 text-muted-foreground" /> Missed:{" "}
                      {new Date(m.originalDate).toLocaleDateString()}
                    </p>
                    {m.reason && (
                      <p className="mt-1 text-[9px] font-medium text-warning">
                        Reason: &quot;{m.reason}&quot;
                      </p>
                    )}
                    {m.scheduledDate && (
                      <p className="mt-1 text-[9px] font-bold text-success">
                        Scheduled: {new Date(m.scheduledDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-end gap-2 sm:flex-col">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        m.status === "Scheduled"
                          ? "border border-success/20 bg-success/10 text-success"
                          : m.status === "Declined"
                            ? "border border-destructive/20 bg-destructive/10 text-destructive"
                            : "border border-warning/20 bg-warning/10 text-warning"
                      }`}
                    >
                      {m.status}
                    </span>

                    {m.status === "Awaiting Action" && (
                      <div className="mt-1 flex gap-1.5">
                        <Button
                          onClick={() => handleOpenApproveDialog(m)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-success p-1.5 text-success-foreground shadow-sm hover:bg-success/90 active:scale-95"
                          title="Schedule Make-up"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeclineRequest(m.id)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-destructive p-1.5 text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-95"
                          title="Decline Make-up"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs font-medium text-muted-foreground">
                No make-up requests filed.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Schedule Make-up Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-1.5 text-base font-bold text-foreground">
              <CalendarCheck className="h-5 w-5 text-foreground" />
              Schedule Make-up Session
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Approve and set the reschedulation date for{" "}
              {selectedRequest?.studentProfile?.fullName || "this student"}.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleApproveRequest} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Scheduled Date
              </Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 border-border text-xs"
                required
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApproveDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingMakeup}
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {updatingMakeup ? "Scheduling..." : "Approve & Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
