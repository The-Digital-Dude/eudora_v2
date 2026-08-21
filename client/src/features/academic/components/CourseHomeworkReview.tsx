"use client";

import { CheckCircle2, Loader2, Paperclip, PencilLine, UserRound } from "lucide-react";
import React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetCoursesQuery } from "@/features/catalog/catalogApi";

import {
  homeworkAttachmentUrl,
  useGetHomeworkForCourseQuery,
  useGetHomeworkSubmissionsQuery,
  useGradeHomeworkSubmissionMutation,
} from "../homeworkApi";

/**
 * Marking for homework that lives in a course rather than a cohort.
 *
 * A sibling of TeacherHomeworkView rather than a branch inside it: that view is
 * built around a batch — it picks a batch, lists its homework, and draws its
 * roster from the batch's enrolments. A checkpoint has none of those, so
 * bending it to fit would have meant every one of its queries growing an
 * "or the course version" arm. Both feed the same grading endpoint.
 *
 * Deliberately shows only what was handed in. Who *hasn't* handed in is a
 * roster question about the whole course, which is the teacher course view's
 * job, not this screen's.
 */
export function CourseHomeworkReview() {
  const [courseId, setCourseId] = React.useState("");
  const [activeHomeworkId, setActiveHomeworkId] = React.useState("");

  const { data: coursesData, isLoading: isLoadingCourses } = useGetCoursesQuery({
    limit: 100,
  });
  const courses = React.useMemo(() => coursesData?.items ?? [], [coursesData]);

  React.useEffect(() => {
    if (courses.length > 0 && !courseId) setCourseId(courses[0].id);
  }, [courses, courseId]);

  const { data: homeworkList = [], isLoading: isLoadingHomework } =
    useGetHomeworkForCourseQuery(courseId, { skip: !courseId });

  const { data: submissions = [] } = useGetHomeworkSubmissionsQuery(activeHomeworkId, {
    skip: !activeHomeworkId,
  });

  const activeHomework = homeworkList.find((hw) => hw.id === activeHomeworkId);

  if (isLoadingCourses) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
          Course
        </label>
        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setActiveHomeworkId("");
          }}
          className="border-border bg-card h-9 cursor-pointer rounded-xl border px-2 text-xs"
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {isLoadingHomework ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : homeworkList.length === 0 ? (
        <p className="border-border bg-card rounded-2xl border px-5 py-4 text-[11px] text-muted-foreground">
          No homework checkpoints in this course yet. Add one from the course
          builder — the item kind is &ldquo;Homework&rdquo;.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-1.5">
            {homeworkList.map((hw) => {
              const isActive = hw.id === activeHomeworkId;
              return (
                <button
                  key={hw.id}
                  type="button"
                  onClick={() => setActiveHomeworkId(hw.id)}
                  className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-all ${
                    isActive
                      ? "border-foreground bg-muted/50"
                      : "border-border bg-card hover:border-foreground/30"
                  }`}
                >
                  <p className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                    <PencilLine className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{hw.title}</span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                    {hw.moduleItem?.concept.name ?? "Unfiled"} · {hw.maxPoints} marks
                  </p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {hw._count.submissions} handed in
                  </p>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {!activeHomework ? (
              <p className="border-border bg-card rounded-2xl border px-5 py-4 text-[11px] text-muted-foreground">
                Pick a checkpoint to see what has been handed in.
              </p>
            ) : submissions.length === 0 ? (
              <p className="border-border bg-card rounded-2xl border px-5 py-4 text-[11px] text-muted-foreground">
                Nothing handed in for this checkpoint yet.
              </p>
            ) : (
              submissions.map((submission) => (
                <SubmissionRow
                  key={submission.id}
                  submission={submission}
                  maxPoints={activeHomework.maxPoints}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  maxPoints,
}: {
  submission: any;
  maxPoints: number;
}) {
  const [gradeSubmission, { isLoading }] = useGradeHomeworkSubmissionMutation();
  const [points, setPoints] = React.useState<string>(
    submission.pointsEarned != null ? String(submission.pointsEarned) : "",
  );
  const [feedback, setFeedback] = React.useState<string>(submission.feedback ?? "");
  const isGraded = submission.status === "GRADED";

  const save = async () => {
    const value = Number(points);
    if (!Number.isFinite(value) || value < 0 || value > maxPoints) {
      toast.error(`Give a mark between 0 and ${maxPoints}.`);
      return;
    }
    try {
      await gradeSubmission({
        submissionId: submission.id,
        pointsEarned: value,
        feedback: feedback.trim() || undefined,
      }).unwrap();
      toast.success("Marked.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not save that mark.");
    }
  };

  return (
    <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
            <UserRound className="text-muted-foreground h-3.5 w-3.5" />
            {submission.studentProfile?.fullName ?? "Unknown learner"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            {new Date(submission.submissionDate).toLocaleDateString()}
            {submission.status === "LATE" ? " · late" : ""}
            {/* Worth showing: for a young learner the guardian uploads, and a
                marker reading the work should know whose hands typed it. */}
            {submission.submittedBy &&
            submission.submittedBy.id !== submission.studentProfile?.userId
              ? ` · uploaded by ${submission.submittedBy.firstName} ${submission.submittedBy.lastName}`
              : ""}
          </p>
        </div>
        {isGraded && (
          <span className="text-success inline-flex items-center gap-1 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" />
            {submission.pointsEarned} / {maxPoints}
          </span>
        )}
      </div>

      {submission.content && (
        <p className="text-muted-foreground border-border border-t pt-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {submission.content}
        </p>
      )}

      {submission.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {submission.attachments.map((attachment: any) => (
            <a
              key={attachment.fileUploadId}
              href={homeworkAttachmentUrl(attachment.fileUploadId)}
              target="_blank"
              rel="noreferrer"
              className="border-border bg-muted/40 text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[18ch] truncate">{attachment.file.originalName}</span>
            </a>
          ))}
        </div>
      )}

      <div className="border-border flex flex-wrap items-end gap-2 border-t pt-3">
        <label className="w-24">
          <span className="text-muted-foreground mb-1 block text-[9px] font-bold tracking-wider uppercase">
            Mark / {maxPoints}
          </span>
          <Input
            type="number"
            min={0}
            max={maxPoints}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="border-border h-9 text-xs"
          />
        </label>
        <label className="min-w-[180px] flex-1">
          <span className="text-muted-foreground mb-1 block text-[9px] font-bold tracking-wider uppercase">
            Feedback
          </span>
          <Input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What did they do well?"
            className="border-border h-9 text-xs"
          />
        </label>
        <Button
          onClick={save}
          disabled={isLoading}
          className="bg-foreground text-background hover:bg-foreground/90 h-9 cursor-pointer rounded-xl text-xs font-semibold"
        >
          {isGraded ? "Update mark" : "Save mark"}
        </Button>
      </div>
    </div>
  );
}
