"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateAssessmentMutation,
  useGetAssessmentTypesQuery,
  useGetTermsQuery,
} from "@/features/assessments/assessmentsApi";
import { useGetClassesQuery, useGetSubjectsQuery } from "@/features/assessments/questionsApi";

export default function CreateAssessmentPage() {
  const router = useRouter();
  const { data: subjectsData } = useGetSubjectsQuery();
  const { data: classesData } = useGetClassesQuery();
  const { data: typesData } = useGetAssessmentTypesQuery();
  const { data: termsData } = useGetTermsQuery();
  const [createAssessment, { isLoading: isCreating }] = useCreateAssessmentMutation();

  const subjects = subjectsData?.items || [];
  const classes = classesData?.items || [];
  const types = typesData?.items || [];
  const terms = termsData?.items || [];

  const [title, setTitle] = React.useState("");
  const [typeId, setTypeId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [termId, setTermId] = React.useState("");
  const [week, setWeek] = React.useState("");
  const [duration, setDuration] = React.useState("60");
  const [totalMarks, setTotalMarks] = React.useState("100");
  const [description, setDescription] = React.useState("");
  const [countsTowardGrade, setCountsTowardGrade] = React.useState(true);
  const [maxAttempts, setMaxAttempts] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Please enter a title.");
    if (!typeId) return toast.error("Please select an assessment type.");
    if (!subjectId) return toast.error("Please select a subject.");
    if (!classId) return toast.error("Please select a grade level.");

    try {
      const created = await createAssessment({
        title,
        description: description.trim() || undefined,
        assessmentTypeId: typeId,
        subjectId,
        classId,
        termId: termId || null,
        weekNumber: week ? parseInt(week) : null,
        estimatedDurationMinutes: parseInt(duration) || 60,
        totalMarks: parseInt(totalMarks) || 100,
        countsTowardGrade,
        maxAttempts: maxAttempts ? parseInt(maxAttempts) : null,
        status: "draft",
      }).unwrap();

      toast.success("Assessment created successfully!");
      router.push(`/assessments/${created.id}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create assessment.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="space-y-1">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Assessments
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
          <Sparkles className="h-6 w-6 text-primary" />
          Create Assessment Paper
        </h1>
      </div>

      <Card className="max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Paper Title
            </Label>
            <Input
              placeholder="e.g. Calculus Mid-Term Examination"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl bg-muted/30 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Description (optional)
            </Label>
            <Textarea
              placeholder="Shown to students before they start the assessment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[70px] rounded-xl bg-muted/30 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Assessment Type
              </Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Subject
              </Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 text-xs">
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Grade Level
              </Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 text-xs">
                  <SelectValue placeholder="Select level..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {classes.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Term / Period
              </Label>
              <Select value={termId} onValueChange={setTermId}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 text-xs">
                  <SelectValue placeholder="Optional term..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Week No
              </Label>
              <Input
                type="number"
                placeholder="Optional"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="h-10 rounded-xl bg-muted/30 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Duration (mins)
              </Label>
              <Input
                type="number"
                placeholder="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10 rounded-xl bg-muted/30 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Max Marks
              </Label>
              <Input
                type="number"
                placeholder="100"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="h-10 rounded-xl bg-muted/30 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-muted/30 px-3">
              <Label className="text-xs font-semibold text-foreground">Counts toward grade</Label>
              <Switch checked={countsTowardGrade} onCheckedChange={setCountsTowardGrade} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Max Attempts
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                className="h-10 rounded-xl bg-muted/30 text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/assessments")}
              className="h-10 flex-1 cursor-pointer rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="h-10 flex-1 cursor-pointer rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isCreating ? "Creating..." : "Create Paper"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
