"use client";

import { Calendar,GraduationCap, User, Users } from "lucide-react";
import React, { useEffect,useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter,DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Assessment,
  useCreateAssignmentMutation,
  useGetBatchesQuery,
  useGetStudentsQuery,
} from "@/features/assessments/assessmentsApi";

interface AssignmentWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
}

export function AssignmentWizardDialog({
  open,
  onOpenChange,
  assessment,
}: AssignmentWizardDialogProps) {
  const { data: batchesData, isLoading: isLoadingBatches } = useGetBatchesQuery();
  const { data: studentsData, isLoading: isLoadingStudents } = useGetStudentsQuery();

  const batches = batchesData?.items || [];
  const students = studentsData?.items || [];

  const [createAssignment, { isLoading: isAssigning }] = useCreateAssignmentMutation();

  const [targetType, setTargetType] = useState<"batch" | "student">("batch");
  const [batchId, setBatchId] = useState<string>("");
  const [studentProfileId, setStudentProfileId] = useState<string>("");
  const [opensAt, setOpensAt] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");

  // Set default dates
  useEffect(() => {
    if (open) {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      // format as YYYY-MM-DDThh:mm
      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const h = String(date.getHours()).padStart(2, "0");
        const min = String(date.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${d}T${h}:${min}`;
      };

      setOpensAt(formatDate(now));
      setDueAt(formatDate(nextWeek));
      
      // Reset targets
      setBatchId("");
      setStudentProfileId("");
      setTargetType("batch");
    }
  }, [open]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assessment) return;

    if (targetType === "batch" && !batchId) {
      return toast.error("Please select a batch.");
    }
    if (targetType === "student" && !studentProfileId) {
      return toast.error("Please select a student profile.");
    }

    if (new Date(opensAt) >= new Date(dueAt)) {
      return toast.error("Due date must be after open date.");
    }

    try {
      await createAssignment({
        assessmentId: assessment.id,
        batchId: targetType === "batch" ? batchId : null,
        studentProfileId: targetType === "student" ? studentProfileId : null,
        opensAt: new Date(opensAt).toISOString(),
        dueAt: new Date(dueAt).toISOString(),
      }).unwrap();

      toast.success(
        targetType === "batch"
          ? "Assessment successfully assigned to the batch!"
          : "Assessment successfully assigned to student!"
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to create assignment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Assign Assessment
          </DialogTitle>
          {assessment && (
            <p className="text-xs text-muted-foreground mt-1">
              Assigning: <span className="font-semibold text-foreground">{assessment.title}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleAssign} className="space-y-5 mt-4">
          {/* Target toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assign To
            </Label>
            <div className="flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setTargetType("batch")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  targetType === "batch"
                    ? "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Entire Batch
              </button>
              <button
                type="button"
                onClick={() => setTargetType("student")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  targetType === "student"
                    ? "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Specific Student
              </button>
            </div>
          </div>

          {/* Class selector */}
          {targetType === "batch" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Batch
              </Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                  <SelectValue placeholder={isLoadingBatches ? "Loading batches..." : "Select batch..."} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {batches.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Student selector */}
          {targetType === "student" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Student Profile
              </Label>
              <Select value={studentProfileId} onValueChange={setStudentProfileId}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                  <SelectValue placeholder={isLoadingStudents ? "Loading students..." : "Select student..."} />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60 overflow-y-auto">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Picker Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Opens At
              </Label>
              <Input
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Due At
              </Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/50"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 flex-1 cursor-pointer rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAssigning}
              className="h-10 flex-1 cursor-pointer rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary"
            >
              {isAssigning ? "Assigning..." : "Assign Assessment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
