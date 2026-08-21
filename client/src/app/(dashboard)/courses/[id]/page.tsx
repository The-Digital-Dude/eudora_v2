"use client";

import {
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  FileText,
  GraduationCap,
  Loader2,
  Lock,
  MessageSquare,
  PencilLine,
  PlayCircle,
  Plus,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

import { CourseTeachersPanel } from "@/app/(dashboard)/courses/components/course-teachers-panel";
import { useGetAssessmentsQuery } from "@/features/assessments/assessmentsApi";
import type { ModuleItemKind } from "@/features/catalog/catalogApi";
import { useCreateModuleItemMutation,useGetCourseDetailQuery } from "@/features/catalog/catalogApi";
import { useCreateConceptMutation } from "@/features/clio/clioApi";

import { CourseHomeworkProgress } from "./components/course-homework-progress";

const kindIcon: Record<ModuleItemKind, React.ElementType> = {
  VIDEO: PlayCircle,
  READING: FileText,
  DISCUSSION: MessageSquare,
  ASSESSMENT: ClipboardList,
  LIVE_CLASS: Radio,
  HOMEWORK: PencilLine,
};

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-success/10 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-destructive/10 text-destructive",
};

function AddModuleItemForm({ conceptId }: { conceptId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState<ModuleItemKind>("VIDEO");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [readingContent, setReadingContent] = useState("");
  const [discussionPrompt, setDiscussionPrompt] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [homeworkInstructions, setHomeworkInstructions] = useState("");
  const [homeworkMaxPoints, setHomeworkMaxPoints] = useState("10");
  const [homeworkDueDate, setHomeworkDueDate] = useState("");
  const { data: assessmentsData } = useGetAssessmentsQuery(undefined, { skip: kind !== "ASSESSMENT" });
  const [createModuleItem, { isLoading }] = useCreateModuleItemMutation();

  const reset = () => {
    setTitle("");
    setVideoUrl("");
    setReadingContent("");
    setDiscussionPrompt("");
    setAssessmentId("");
    setHomeworkInstructions("");
    setHomeworkMaxPoints("10");
    setHomeworkDueDate("");
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    if (kind === "ASSESSMENT" && !assessmentId) {
      return toast.error("Select an assessment to link.");
    }
    if (kind === "HOMEWORK" && !(Number(homeworkMaxPoints) > 0)) {
      return toast.error("Marks available must be greater than zero.");
    }
    try {
      await createModuleItem({
        conceptId,
        kind,
        title: title.trim(),
        videoUrl: kind === "VIDEO" ? videoUrl.trim() : undefined,
        readingContent: kind === "READING" ? readingContent.trim() : undefined,
        discussionPrompt: kind === "DISCUSSION" ? discussionPrompt.trim() : undefined,
        assessmentId: kind === "ASSESSMENT" ? assessmentId : undefined,
        homeworkInstructions:
          kind === "HOMEWORK" ? homeworkInstructions.trim() || undefined : undefined,
        homeworkMaxPoints: kind === "HOMEWORK" ? Number(homeworkMaxPoints) : undefined,
        // Left off when blank: a self-paced checkpoint has no deadline.
        homeworkDueDate: kind === "HOMEWORK" ? homeworkDueDate || undefined : undefined,
        status: "PUBLISHED",
      }).unwrap();
      toast.success("Item added.");
      reset();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add item.");
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> Add Item
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-xl border border-dashed border-border p-3">
      <div className="flex gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ModuleItemKind)}
          className="h-8 rounded-lg border border-border bg-card px-2 text-[10px]"
        >
          <option value="VIDEO">Video</option>
          <option value="READING">Reading</option>
          <option value="DISCUSSION">Discussion</option>
          <option value="ASSESSMENT">Assessment</option>
          <option value="LIVE_CLASS">Live Class</option>
          <option value="HOMEWORK">Homework</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item title..."
          className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-[10px]"
        />
      </div>

      {kind === "VIDEO" && (
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL (YouTube, Vimeo, MP4)..."
          className="h-8 w-full rounded-lg border border-border bg-card px-2 text-[10px]"
        />
      )}
      {kind === "READING" && (
        <textarea
          value={readingContent}
          onChange={(e) => setReadingContent(e.target.value)}
          placeholder="Reading content..."
          className="h-20 w-full resize-none rounded-lg border border-border bg-card p-2 text-[10px]"
        />
      )}
      {kind === "DISCUSSION" && (
        <input
          value={discussionPrompt}
          onChange={(e) => setDiscussionPrompt(e.target.value)}
          placeholder="Discussion prompt..."
          className="h-8 w-full rounded-lg border border-border bg-card px-2 text-[10px]"
        />
      )}
      {kind === "ASSESSMENT" && (
        <select
          value={assessmentId}
          onChange={(e) => setAssessmentId(e.target.value)}
          className="h-8 w-full rounded-lg border border-border bg-card px-2 text-[10px]"
        >
          <option value="">Select assessment...</option>
          {(assessmentsData?.items ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      )}
      {kind === "HOMEWORK" && (
        <div className="space-y-2">
          <textarea
            value={homeworkInstructions}
            onChange={(e) => setHomeworkInstructions(e.target.value)}
            placeholder="What should they do, and what does good look like?"
            className="h-20 w-full resize-none rounded-lg border border-border bg-card p-2 text-[10px]"
          />
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                Marks available
              </span>
              <input
                type="number"
                min={1}
                value={homeworkMaxPoints}
                onChange={(e) => setHomeworkMaxPoints(e.target.value)}
                className="h-8 w-full rounded-lg border border-border bg-card px-2 text-[10px]"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                Due date — optional
              </span>
              <input
                type="date"
                value={homeworkDueDate}
                onChange={(e) => setHomeworkDueDate(e.target.value)}
                className="h-8 w-full rounded-lg border border-border bg-card px-2 text-[10px]"
              />
            </label>
          </div>
          <p className="rounded-lg bg-muted/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
            Leave the date blank for a self-paced course — the learner reaches this
            checkpoint whenever they get there, so nothing can be late.
          </p>
        </div>
      )}
      {kind === "LIVE_CLASS" && (
        <p className="rounded-lg bg-muted/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
          This reserves a live session in the outline. Each batch schedules its own
          meeting time and join link against it from{" "}
          <span className="font-semibold text-foreground">Live Classes</span> — adding
          one here switches the course to <span className="font-semibold text-foreground">LIVE</span> delivery.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={reset} className="h-7 rounded-lg px-2.5 text-[10px] font-semibold text-muted-foreground">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="h-7 rounded-lg bg-primary px-2.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}

function AddChapterForm({ courseId }: { courseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"CHAPTER" | "CHECKPOINT">("CHAPTER");
  const [passThresholdPercent, setPassThresholdPercent] = useState("");
  const [createConcept, { isLoading }] = useCreateConceptMutation();

  const reset = () => {
    setName("");
    setDescription("");
    setKind("CHAPTER");
    setPassThresholdPercent("");
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Chapter name is required.");
    try {
      await createConcept({
        name: name.trim(),
        description: description.trim() || undefined,
        courseId,
        kind,
        passThresholdPercent:
          kind === "CHECKPOINT" && passThresholdPercent
            ? Number(passThresholdPercent)
            : undefined,
      }).unwrap();
      toast.success("Chapter added.");
      reset();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add chapter.");
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> Add Chapter
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-xl border border-dashed border-border p-3">
      <div className="flex gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "CHAPTER" | "CHECKPOINT")}
          className="h-8 rounded-lg border border-border bg-card px-2 text-[10px]"
        >
          <option value="CHAPTER">Chapter</option>
          <option value="CHECKPOINT">Checkpoint</option>
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chapter name..."
          className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-[10px]"
        />
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)..."
        className="h-16 w-full resize-none rounded-lg border border-border bg-card p-2 text-[10px]"
      />

      {kind === "CHECKPOINT" && (
        <input
          type="number"
          min="0"
          max="100"
          value={passThresholdPercent}
          onChange={(e) => setPassThresholdPercent(e.target.value)}
          placeholder="Pass threshold % (optional)..."
          className="h-8 w-full rounded-lg border border-border bg-card px-2 text-[10px]"
        />
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={reset} className="h-7 rounded-lg px-2.5 text-[10px] font-semibold text-muted-foreground">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="h-7 rounded-lg bg-primary px-2.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id ?? "";
  const { data: course, isLoading } = useGetCourseDetailQuery(courseId, { skip: !courseId });
  const concepts = course?.concepts ?? [];
  const [tab, setTab] = useState<"curriculum" | "progress">("curriculum");

  if (isLoading) {
    return (
      <div className="flex h-60 w-full items-center justify-center rounded-3xl border border-border bg-card">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-3">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Courses
        </Link>
        <p className="text-sm font-semibold text-foreground">Course not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Courses
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
            <GraduationCap className="h-6 w-6 text-primary" />
            {course.title}
          </h1>
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusColors[course.status] || ""}`}
          >
            {course.status.toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {course.learningSubject.name}
          {course.estimatedHours ? ` · ${course.estimatedHours}h estimated` : ""}
        </p>
      </div>

      {/* Two things happen on a course page: authoring it, and watching people
          work through it. Tabs rather than one long scroll, because they are
          different jobs done at different times. */}
      <div className="border-border flex gap-1 border-b">
        {(
          [
            ["curriculum", "Curriculum"],
            ["progress", "Homework progress"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-current={tab === value ? "page" : undefined}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              tab === value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "progress" && <CourseHomeworkProgress courseId={course.id} />}

      {tab === "curriculum" && (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        {concepts.length === 0 ? (
          <div className="py-2">
            <p className="text-xs text-muted-foreground">
              No chapters have been authored for this course yet.
            </p>
            <AddChapterForm courseId={courseId} />
          </div>
        ) : (
          <div className="ml-4">
            {concepts.map((concept, idx) => {
              const isLast = idx === concepts.length - 1;
              return (
                <div key={concept.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast && <span className="absolute left-[11px] top-6 h-full w-px bg-border" />}
                  <span className="relative z-10 shrink-0 bg-muted/20">
                    {concept.isDone ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : concept.isLocked ? (
                      <Lock className="m-0.5 h-5 w-5 text-muted-foreground/40" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </span>
                  <div className="flex flex-1 items-center justify-between pt-0.5">
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          concept.isDone
                            ? "text-foreground"
                            : concept.isLocked
                              ? "text-muted-foreground/60"
                              : "text-muted-foreground"
                        }`}
                      >
                        {concept.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {concept.kind === "CHECKPOINT" ? "Checkpoint" : "Chapter"}
                        {concept.passThresholdPercent
                          ? ` · requires ${concept.passThresholdPercent}% to pass`
                          : ""}
                      </p>
                      {!concept.isLocked && concept.lessons.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {concept.lessons.map((lesson) => (
                            <Link
                              key={lesson.id}
                              href={`/learn/${lesson.id}`}
                              className="inline-flex items-center gap-0.5 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/10"
                            >
                              {lesson.title} <ChevronRight className="h-2.5 w-2.5" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {concept.items.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {concept.items.map((item) => {
                            const Icon = kindIcon[item.kind];
                            return (
                              <span
                                key={item.id}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[9px] font-bold text-muted-foreground"
                              >
                                <Icon className="h-2.5 w-2.5" /> {item.title}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <AddModuleItemForm conceptId={concept.id} />
                    </div>
                    {concept.isDone && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-success uppercase">
                        Completed
                      </span>
                    )}
                    {concept.isLocked && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <AddChapterForm courseId={courseId} />
          </div>
        )}
      </div>
      )}

      {tab === "curriculum" && <CourseTeachersPanel courseId={courseId} />}
    </div>
  );
}
