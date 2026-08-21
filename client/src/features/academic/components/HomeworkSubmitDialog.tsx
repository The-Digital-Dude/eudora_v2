"use client";

import { Paperclip,Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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

import {
  useSubmitHomeworkMutation,
  useUploadHomeworkAttachmentMutation,
} from "../homeworkApi";

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
  /**
   * Files already stored privately, held as ids rather than URLs. The old
   * version kept public URLs the browser had been handed, which is what made a
   * child's work readable by anyone with the link.
   */
  const [attachments, setAttachments] = React.useState<
    { id: string; originalName: string }[]
  >([]);
  const [submitHomework, { isLoading: isSubmitting }] = useSubmitHomeworkMutation();
  const [uploadAttachment, { isLoading: isUploading }] =
    useUploadHomeworkAttachmentMutation();

  React.useEffect(() => {
    if (!open) {
      setSubmissionContent("");
      setAttachments([]);
    }
  }, [open]);

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionContent && attachments.length === 0) {
      toast.error("Please type a response or upload at least one submission file.");
      return;
    }

    try {
      await submitHomework({
        homeworkId,
        content: submissionContent || undefined,
        attachmentFileIds: attachments.map((a) => a.id),
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
      <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Send className="h-5 w-5 text-primary" />
            Submit Homework Assignment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Submit text responses, links, or file attachments for grading.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitHomework} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Solution Text / Link
            </Label>
            <textarea
              placeholder="Type your notes or response details here..."
              value={submissionContent}
              onChange={(e) => setSubmissionContent(e.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground focus:outline-none/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              File Attachments
            </Label>
            {/*
              A plain file input rather than the shared FileUploader: that one
              posts to the public /uploads endpoint and hands back a public URL,
              which is precisely what must not happen to a child's work. This
              goes to the private homework endpoint and keeps only the id.
            */}
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/heic"
              disabled={isUploading || attachments.length >= 5}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const stored = await uploadAttachment(file).unwrap();
                  setAttachments((prev) => [
                    ...prev,
                    { id: stored.id, originalName: stored.originalName },
                  ]);
                } catch (err: any) {
                  toast.error(err?.data?.message || "Could not upload that file.");
                } finally {
                  e.target.value = "";
                }
              }}
              className="w-full cursor-pointer rounded-xl border border-dashed border-border bg-muted/30 p-3 text-[10px] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-[10px] file:font-semibold file:text-background"
            />
            <p className="text-[10px] text-muted-foreground">
              PDF or a photo, up to 15MB each. Only you, your teacher and
              {" "}Eudora staff can open what you upload.
            </p>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {attachments.map((attachment, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="flex items-center gap-1.5 rounded-lg border-none bg-muted px-2 py-1 text-[9px] text-foreground hover:bg-muted"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[16ch] truncate">{attachment.originalName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="ml-1 text-xs font-bold hover:text-destructive"
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
              className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary"
            >
              {isSubmitting ? "Submitting..." : "Submit Homework"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
