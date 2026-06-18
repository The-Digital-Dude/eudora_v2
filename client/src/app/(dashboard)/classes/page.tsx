"use client";

import React, { useState } from "react";
import {
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  X,
  CalendarCheck,
  AlertCircle
} from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
          Classes, Attendance & Make-ups
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Schedule classrooms, record attendance logs, and manage make-up sessions.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Active Classes</span>
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {classesLoading ? "..." : activeClassesCount}
          </p>
          <p className="text-[10px] text-neutral-400">Scheduled course classes</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Attendance Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">96.8%</p>
          <p className="text-[10px] text-emerald-600 font-semibold">+0.4% from last term</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Make-ups Pending</span>
            <AlertTriangle className={`w-4 h-4 ${pendingMakeupsCount > 0 ? "text-amber-500 animate-pulse" : "text-neutral-300"}`} />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {makeupLoading ? "..." : `${pendingMakeupsCount} Requests`}
          </p>
          <p className="text-[10px] text-neutral-400">Awaiting schedule matching</p>
        </Card>
      </div>

      {/* Lists Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Classes List */}
        <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Class Schedule Logs</h2>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {classesLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-neutral-50 animate-pulse rounded-2xl border border-neutral-100" />
              ))
            ) : classList.length > 0 ? (
              classList.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-all">
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-900">{c.name}</h3>
                    <p className="text-[10px] text-neutral-400 font-mono uppercase mt-0.5">Code: {c.code}</p>
                    {c.term && (
                      <p className="text-[9px] text-neutral-400">
                        Term: {c.term.name} {c.term.academicYear ? `(${c.term.academicYear.name})` : ""}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    c.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 text-center py-6 font-medium">No course classes found.</p>
            )}
          </div>
        </Card>

        {/* Make-up Queue */}
        <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Make-up Request Queue</h2>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {makeupLoading ? (
              [...Array(2)].map((_, i) => (
                <div key={i} className="h-20 bg-neutral-50 animate-pulse rounded-2xl border border-neutral-100" />
              ))
            ) : makeupList.length > 0 ? (
              makeupList.map((m: any) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-all gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-900">
                      {m.studentProfile?.fullName || "Student"}
                    </h3>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Class: <span className="font-semibold text-neutral-600">{m.courseClass?.name || "N/A"}</span>
                    </p>
                    <p className="text-[9px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-neutral-400" /> Missed: {new Date(m.originalDate).toLocaleDateString()}
                    </p>
                    {m.reason && (
                      <p className="text-[9px] text-amber-600 font-medium mt-1">Reason: "{m.reason}"</p>
                    )}
                    {m.scheduledDate && (
                      <p className="text-[9px] text-emerald-600 font-bold mt-1">
                        Scheduled: {new Date(m.scheduledDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      m.status === "Scheduled"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : m.status === "Declined"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {m.status}
                    </span>

                    {m.status === "Awaiting Action" && (
                      <div className="flex gap-1.5 mt-1">
                        <Button
                          onClick={() => handleOpenApproveDialog(m)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-1.5 h-7 w-7 flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                          title="Schedule Make-up"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeclineRequest(m.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg p-1.5 h-7 w-7 flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                          title="Decline Make-up"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 text-center py-6 font-medium">No make-up requests filed.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Schedule Make-up Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display flex items-center gap-1.5">
              <CalendarCheck className="w-5 h-5 text-neutral-900" />
              Schedule Make-up Session
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Approve and set the reschedulation date for {selectedRequest?.studentProfile?.fullName || "this student"}.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleApproveRequest} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Scheduled Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 text-xs border-neutral-200"
                required
              />
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApproveDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingMakeup}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
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
