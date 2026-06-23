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
      <DialogContent className="max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-50">
            <Award className="h-5 w-5 text-emerald-500" />
            Grade Student Submission
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Input score points and feedback comments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGradeSubmission} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Points Earned (Max: {maxPoints} pts)
            </Label>
            <Input
              type="number"
              min={0}
              max={maxPoints}
              value={gradePoints}
              onChange={(e) => setGradePoints(Number(e.target.value))}
              className="h-10 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Teacher Feedback
            </Label>
            <textarea
              placeholder="Write feedback comments or grading notes..."
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
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
              className="h-10 cursor-pointer rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {isGrading ? "Submitting..." : "Save Grade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
