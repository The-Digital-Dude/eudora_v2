"use client";

import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Users,
  X,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
import {
  useGetCourseClassesQuery,
  useGetMakeupRequestsQuery,
  useUpdateMakeupRequestMutation,
} from "@/features/dashboard/dashboardApi";

export default function ClassesPage() {
  // RTK queries and mutations
  const { data: classesData, isLoading: classesLoading } = useGetCourseClassesQuery();
  const { data: makeupData, isLoading: makeupLoading } = useGetMakeupRequestsQuery();
  const [updateMakeupRequest, { isLoading: updatingMakeup }] = useUpdateMakeupRequestMutation();

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
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-neutral-900">
          Classes, Attendance & Make-ups
        </h1>
        <p className="mt-0.5 text-xs text-neutral-500">
          Schedule classrooms, record attendance logs, and manage make-up sessions.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Active Classes
            </span>
            <Calendar className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-neutral-900">
            {classesLoading ? "..." : activeClassesCount}
          </p>
          <p className="text-[10px] text-neutral-400">Scheduled course classes</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Attendance Rate
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-display text-2xl font-bold text-neutral-900">96.8%</p>
          <p className="text-[10px] font-semibold text-emerald-600">+0.4% from last term</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Make-ups Pending
            </span>
            <AlertTriangle
              className={`h-4 w-4 ${pendingMakeupsCount > 0 ? "animate-pulse text-amber-500" : "text-neutral-300"}`}
            />
          </div>
          <p className="font-display text-2xl font-bold text-neutral-900">
            {makeupLoading ? "..." : `${pendingMakeupsCount} Requests`}
          </p>
          <p className="text-[10px] text-neutral-400">Awaiting schedule matching</p>
        </Card>
      </div>

      {/* Lists Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Classes List */}
        <Card className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6">
          <h2 className="font-display text-sm font-bold text-neutral-900">Class Schedule Logs</h2>
          <div className="max-h-[350px] space-y-3 overflow-y-auto pr-1">
            {classesLoading ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50"
                />
              ))
            ) : classList.length > 0 ? (
              classList.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5 transition-all hover:border-neutral-200"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-900">{c.name}</h3>
                    <p className="mt-0.5 font-mono text-[10px] text-neutral-400 uppercase">
                      Code: {c.code}
                    </p>
                    {c.term && (
                      <p className="text-[9px] text-neutral-400">
                        Term: {c.term.name}{" "}
                        {c.term.academicYear ? `(${c.term.academicYear.name})` : ""}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      c.status === "ACTIVE"
                        ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border border-neutral-200 bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs font-medium text-neutral-400">
                No course classes found.
              </p>
            )}
          </div>
        </Card>

        {/* Make-up Queue */}
        <Card className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6">
          <h2 className="font-display text-sm font-bold text-neutral-900">Make-up Request Queue</h2>
          <div className="max-h-[350px] space-y-3 overflow-y-auto pr-1">
            {makeupLoading ? (
              [...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50"
                />
              ))
            ) : makeupList.length > 0 ? (
              makeupList.map((m: any) => (
                <div
                  key={m.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5 transition-all hover:border-neutral-200 sm:flex-row sm:items-center"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-900">
                      {m.studentProfile?.fullName || "Student"}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-neutral-400">
                      Class:{" "}
                      <span className="font-semibold text-neutral-600">
                        {m.courseClass?.name || "N/A"}
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[9px] text-neutral-400">
                      <Clock className="h-3 w-3 text-neutral-400" /> Missed:{" "}
                      {new Date(m.originalDate).toLocaleDateString()}
                    </p>
                    {m.reason && (
                      <p className="mt-1 text-[9px] font-medium text-amber-600">
                        Reason: "{m.reason}"
                      </p>
                    )}
                    {m.scheduledDate && (
                      <p className="mt-1 text-[9px] font-bold text-emerald-600">
                        Scheduled: {new Date(m.scheduledDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-end gap-2 sm:flex-col">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        m.status === "Scheduled"
                          ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                          : m.status === "Declined"
                            ? "border border-rose-100 bg-rose-50 text-rose-700"
                            : "border border-amber-100 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {m.status}
                    </span>

                    {m.status === "Awaiting Action" && (
                      <div className="mt-1 flex gap-1.5">
                        <Button
                          onClick={() => handleOpenApproveDialog(m)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-emerald-600 p-1.5 text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                          title="Schedule Make-up"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeclineRequest(m.id)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-rose-600 p-1.5 text-white shadow-sm hover:bg-rose-700 active:scale-95"
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
              <p className="py-6 text-center text-xs font-medium text-neutral-400">
                No make-up requests filed.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Schedule Make-up Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-neutral-200 bg-white p-6">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-1.5 text-base font-bold text-neutral-900">
              <CalendarCheck className="h-5 w-5 text-neutral-900" />
              Schedule Make-up Session
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Approve and set the reschedulation date for{" "}
              {selectedRequest?.studentProfile?.fullName || "this student"}.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-500">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleApproveRequest} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Scheduled Date
              </Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 border-neutral-200 text-xs"
                required
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
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
                className="h-10 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800"
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
