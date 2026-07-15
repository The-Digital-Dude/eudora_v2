"use client";

import { Award } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

import { useGradeHomeworkSubmissionMutation } from "../homeworkApi";

interface HomeworkGradeDialogProps {
  submissionId: string;
  maxPoints: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGradeSuccess?: () => void;
  initialPoints?: number;
  initialFeedback?: string;
}

export function HomeworkGradeDialog({
  submissionId,
  maxPoints,
  open,
  onOpenChange,
  onGradeSuccess,
  initialPoints = 0,
  initialFeedback = "",
}: HomeworkGradeDialogProps) {
  const [gradePoints, setGradePoints] = React.useState<number>(initialPoints);
  const [gradeFeedback, setGradeFeedback] = React.useState<string>(initialFeedback);
  const [gradeSubmission, { isLoading: isGrading }] = useGradeHomeworkSubmissionMutation();

  React.useEffect(() => {
    if (open) {
      setGradePoints(initialPoints);
      setGradeFeedback(initialFeedback);
    }
  }, [open, initialPoints, initialFeedback]);

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionId) return;

    try {
      await gradeSubmission({
        submissionId,
        pointsEarned: Number(gradePoints),
        feedback: gradeFeedback || undefined,
      }).unwrap();

      toast.success("Submission graded successfully!");
      onOpenChange(false);
      if (onGradeSuccess) {
        onGradeSuccess();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to grade submission.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Award className="h-5 w-5 text-success" />
            Grade Student Submission
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Input score points and feedback comments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGradeSubmission} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Points Earned (Max: {maxPoints} pts)
            </Label>
            <Input
              type="number"
              min={0}
              max={maxPoints}
              value={gradePoints}
              onChange={(e) => setGradePoints(Number(e.target.value))}
              className="h-10 rounded-xl border-border bg-muted/50 text-xs/50"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Teacher Feedback
            </Label>
            <textarea
              placeholder="Write feedback comments or grading notes..."
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground focus:outline-none/50"
            />
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 cursor-pointer rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isGrading}
              className="h-10 cursor-pointer rounded-xl bg-success px-4 text-xs font-semibold text-success-foreground hover:bg-success"
            >
              {isGrading ? "Submitting..." : "Save Grade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
