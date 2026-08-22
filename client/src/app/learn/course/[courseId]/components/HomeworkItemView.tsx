"use client";

import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Paperclip,
  PencilLine,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  homeworkAttachmentUrl,
  useSubmitHomeworkMutation,
  useUploadHomeworkAttachmentMutation,
} from "@/features/academic/homeworkApi";
import type { ModuleItem } from "@/features/catalog/catalogApi";
import { useGetMyHomeworkForItemQuery } from "@/features/catalog/catalogApi";

const MAX_FILES = 5;

/**
 * A homework checkpoint inside a chapter.
 *
 * Sibling of AssessmentItemView, and reached the same way — except that the
 * person working here is usually the guardian acting as the child, since a
 * child created through the family portal has no password of their own. That
 * is why nothing on this screen asks who you are: the acting-child header
 * already answers it, and the API resolves the learner from it.
 */
export function HomeworkItemView({ item }: { item: ModuleItem }) {
  const { data, isLoading } = useGetMyHomeworkForItemQuery(item.id);
  const [uploadAttachment, { isLoading: isUploading }] =
    useUploadHomeworkAttachmentMutation();
  const [submitHomework, { isLoading: isSubmitting }] = useSubmitHomeworkMutation();

  const [text, setText] = React.useState("");
  const [pending, setPending] = React.useState<{ id: string; originalName: string }[]>([]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const { homework, submission } = data;
  const isGraded = submission?.status === "GRADED";

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const stored = await uploadAttachment(file).unwrap();
      setPending((prev) => [...prev, { id: stored.id, originalName: stored.originalName }]);
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not upload that file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && pending.length === 0) {
      toast.error("Write something or attach a file first.");
      return;
    }
    try {
      await submitHomework({
        homeworkId: homework.id,
        content: text.trim() || undefined,
        attachmentFileIds: pending.map((p) => p.id),
      }).unwrap();
      toast.success("Handed in.");
      setText("");
      setPending([]);
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not hand this in.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
          <PencilLine className="h-4 w-4" />
          Homework
        </div>
        <h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
          {homework.title}
        </h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {/* A self-paced checkpoint has no deadline, so saying "no due date"
                is the honest phrasing rather than inventing one. */}
            {homework.dueDate
              ? `Due ${new Date(homework.dueDate).toLocaleDateString()}`
              : "Work at your own pace"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            {homework.maxPoints} marks
          </span>
        </div>
      </div>

      {homework.description && (
        <p className="text-foreground border-border bg-muted/30 rounded-2xl border p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {homework.description}
        </p>
      )}

      {submission && (
        <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-success h-4 w-4" />
            <p className="text-foreground text-xs font-semibold">
              Handed in {new Date(submission.submissionDate).toLocaleDateString()}
              {submission.status === "LATE" ? " · late" : ""}
            </p>
          </div>

          {submission.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {submission.attachments.map((attachment) => (
                <a
                  key={attachment.fileUploadId}
                  href={homeworkAttachmentUrl(attachment.fileUploadId)}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border bg-muted/40 text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[18ch] truncate">
                    {attachment.file.originalName}
                  </span>
                </a>
              ))}
            </div>
          )}

          {isGraded && (
            <div className="border-border border-t pt-3">
              <p className="text-foreground text-sm font-semibold">
                {submission.pointsEarned} / {homework.maxPoints} marks
              </p>
              {submission.feedback && (
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {submission.feedback}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Marked work is left alone: replacing it would quietly discard a
          teacher's marking. Everything else can be handed in again. */}
      {!isGraded && (
        <div className="border-border space-y-3 rounded-2xl border border-dashed p-4">
          <p className="text-foreground text-xs font-semibold">
            {submission ? "Hand in again" : "Hand in your work"}
          </p>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            placeholder="Type your answer, or just attach a photo of it."
            className="border-border bg-card text-foreground w-full resize-none rounded-xl border p-3 text-xs"
          />

          <label className="border-border hover:border-foreground/30 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-3 text-xs transition-colors">
            {isUploading ? (
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            ) : (
              <Upload className="text-muted-foreground h-4 w-4" />
            )}
            <span className="text-muted-foreground">
              Add a photo or PDF, up to {MAX_FILES} files, 15MB each
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/heic"
              disabled={isUploading || pending.length >= MAX_FILES}
              onChange={handleFile}
              className="sr-only"
            />
          </label>

          {pending.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pending.map((file, index) => (
                <span
                  key={file.id}
                  className="border-border bg-muted/40 text-foreground inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[18ch] truncate">{file.originalName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPending((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove ${file.originalName}`}
                    className="hover:text-destructive cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="bg-foreground text-background hover:bg-foreground/90 h-10 cursor-pointer rounded-xl text-xs font-semibold active:scale-98"
          >
            {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {submission ? "Replace what I handed in" : "Hand it in"}
          </Button>

          <p className="text-muted-foreground text-[10px] leading-relaxed">
            Only you, your teacher and Eudora staff can open what you upload.
          </p>
        </div>
      )}
    </div>
  );
}
