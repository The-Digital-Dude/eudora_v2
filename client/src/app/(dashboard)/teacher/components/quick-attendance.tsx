"use client";

import React, { useState, useEffect } from "react";
import { useGetClassDailySheetQuery, useRecordDailyAttendanceMutation } from "@/features/academic/attendanceApi";
import { CheckCircle2, UserCheck, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface QuickAttendanceProps {
  classSectionId: string;
  onSuccess: () => void;
}

export function QuickAttendance({ classSectionId, onSuccess }: QuickAttendanceProps) {
  // Use today formatted as YYYY-MM-DD
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: roster = [], isLoading, refetch } = useGetClassDailySheetQuery(
    { classSectionId, date: todayStr },
    { skip: !classSectionId }
  );

  const [recordDaily, { isLoading: isSubmitting }] = useRecordDailyAttendanceMutation();

  // Local state for tracking attendance edits
  const [statuses, setStatuses] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED">>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  // Sync state when roster updates
  useEffect(() => {
    if (roster.length > 0) {
      const initialStatuses: Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"> = {};
      const initialRemarks: Record<string, string> = {};

      roster.forEach((student) => {
        initialStatuses[student.studentProfileId] = student.status || "PRESENT"; // Default to Present if unmarked
        initialRemarks[student.studentProfileId] = student.remarks || "";
      });

      setStatuses(initialStatuses);
      setRemarks(initialRemarks);
    }
  }, [roster]);

  const handleStatusChange = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleRemarksChange = (studentId: string, text: string) => {
    setRemarks((prev) => ({ ...prev, [studentId]: text }));
  };

  const handleSave = async () => {
    const payloadRecords = roster.map((student) => ({
      studentProfileId: student.studentProfileId,
      status: statuses[student.studentProfileId] || "PRESENT",
      remarks: remarks[student.studentProfileId] || undefined,
    }));

    try {
      await recordDaily({
        classSectionId,
        date: todayStr,
        records: payloadRecords,
      }).unwrap();

      toast.success("Attendance marked successfully!");
      refetch();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit attendance sheet.");
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl/50/20 backdrop-blur-md flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-muted-foreground">Loading daily roster...</span>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl/50/20 backdrop-blur-md text-center text-muted-foreground text-sm">
        No students placed in this class section yet.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 shadow-xl shadow-black/5/50/20 backdrop-blur-md overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="p-4 border-b border-border/50/40 bg-muted/50/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <UserCheck className="h-4. w-4 text-primary" />
            Attendance Roster
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Recording roll call for: <span className="font-extrabold">{format(new Date(), "MMM dd, yyyy")}</span>
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary text-primary-foreground rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Roster
        </button>
      </div>

      {/* Roster list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {roster.map((student) => {
          const currentStatus = statuses[student.studentProfileId] || "PRESENT";
          return (
            <div
              key={student.studentProfileId}
              className="p-3 rounded-2xl border border-border/40 bg-card/20/40/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-foreground truncate">
                  {student.fullName}
                </h4>
                <input
                  type="text"
                  placeholder="Add remark..."
                  value={remarks[student.studentProfileId] || ""}
                  onChange={(e) => handleRemarksChange(student.studentProfileId, e.target.value)}
                  className="text-[10px] bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full mt-1.5 pb-0.5 text-muted-foreground placeholder-zinc-400"
                />
              </div>

              {/* Attendance Toggles */}
              <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-xl/60 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => handleStatusChange(student.studentProfileId, "PRESENT")}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                    currentStatus === "PRESENT"
                      ? "bg-success text-success-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pres
                </button>
                <button
                  onClick={() => handleStatusChange(student.studentProfileId, "LATE")}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                    currentStatus === "LATE"
                      ? "bg-warning text-warning-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Late
                </button>
                <button
                  onClick={() => handleStatusChange(student.studentProfileId, "ABSENT")}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                    currentStatus === "ABSENT"
                      ? "bg-destructive text-destructive-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Abs
                </button>
                <button
                  onClick={() => handleStatusChange(student.studentProfileId, "EXCUSED")}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                    currentStatus === "EXCUSED"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Exc
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
