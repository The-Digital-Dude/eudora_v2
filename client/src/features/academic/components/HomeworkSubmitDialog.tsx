"use client";

import { Paperclip,Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { FileUploader } from "@/components/file-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { useSubmitHomeworkMutation } from "../homeworkApi";

interface HomeworkSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeworkId: string;
  onSubmitSuccess?: () => void;
}

export function HomeworkSubmitDialog({
  open,
  onOpenChange,
  homeworkId,
  onSubmitSuccess,
}: HomeworkSubmitDialogProps) {
  const [submissionContent, setSubmissionContent] = React.useState("");
  const [submissionAttachments, setSubmissionAttachments] = React.useState<string[]>([]);
  const [submitHomework, { isLoading: isSubmitting }] = useSubmitHomeworkMutation();

  React.useEffect(() => {
    if (!open) {
      setSubmissionContent("");
      setSubmissionAttachments([]);
    }
  }, [open]);

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionContent && submissionAttachments.length === 0) {
      toast.error("Please type a response or upload at least one submission file.");
      return;
    }

    try {
      await submitHomework({
        homeworkId,
        content: submissionContent || undefined,
        attachmentUrls: submissionAttachments,
      }).unwrap();

      toast.success("Homework submitted successfully!");
      onOpenChange(false);
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit homework.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-50">
            <Send className="h-5 w-5 text-violet-500" />
            Submit Homework Assignment
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Submit text responses, links, or file attachments for grading.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitHomework} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Solution Text / Link
            </Label>
            <textarea
              placeholder="Type your notes or response details here..."
              value={submissionContent}
              onChange={(e) => setSubmissionContent(e.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              File Attachments
            </Label>
            <FileUploader
              onUploadSuccess={(url) => {
                setSubmissionAttachments((prev) => [...prev, url]);
                toast.success("File uploaded successfully.");
              }}
              label="Upload submission file"
            />

            {submissionAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {submissionAttachments.map((url, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="flex items-center gap-1.5 rounded-lg border-none bg-neutral-100 px-2 py-1 text-[9px] text-neutral-700 hover:bg-neutral-200"
                  >
                    <Paperclip className="h-3 w-3" />
                    Attachment {i + 1}
                    <button
                      type="button"
                      onClick={() =>
                        setSubmissionAttachments((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="ml-1 text-xs font-bold hover:text-rose-500"
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
              </div>
            )}
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
              disabled={isSubmitting}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500"
            >
              {isSubmitting ? "Submitting..." : "Submit Homework"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
