"use client";

import {
  AlertCircle,
  Award,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  MoreVertical,
  Plus,
  Search,
  Sparkles} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter,DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Assessment,
  useArchiveAssessmentMutation,
  useCreateAssessmentMutation,
  useGetAssessmentsQuery,
  useGetAssessmentTypesQuery,
  useGetTermsQuery,
  usePublishAssessmentMutation,
} from "@/features/assessments/assessmentsApi";
import {
  useGetLevelsQuery,
  useGetSubjectsQuery,
} from "@/features/assessments/questionsApi";

import { AssignmentWizardDialog } from "./components/assignment-wizard-dialog";

export default function AssessmentsPage() {
  // Query filters state
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("all");
  const [levelId, setLevelId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page] = useState(1);

  // Queries
  const { data: assessmentsData, isLoading } = useGetAssessmentsQuery({
    search: search || undefined,
    subjectId: subjectId === "all" ? undefined : subjectId,
    levelId: levelId === "all" ? undefined : levelId,
    status: status === "all" ? undefined : status,
    page,
    pageSize: 12,
  });

  const { data: subjectsData } = useGetSubjectsQuery();
  const { data: levelsData } = useGetLevelsQuery();
  const { data: typesData } = useGetAssessmentTypesQuery();
  const { data: termsData } = useGetTermsQuery();

  const assessments = assessmentsData?.items || [];
  const subjects = subjectsData?.items || [];
  const levels = levelsData?.items || [];
  const types = typesData?.items || [];
  const terms = termsData?.items || [];

  // Mutations
  const [createAssessment, { isLoading: isCreating }] = useCreateAssessmentMutation();
  const [publishAssessment] = usePublishAssessmentMutation();
  const [archiveAssessment] = useArchiveAssessmentMutation();

  // Create modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newLevelId, setNewLevelId] = useState("");
  const [newTermId, setNewTermId] = useState("");
  const [newWeek, setNewWeek] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newTotalMarks, setNewTotalMarks] = useState("100");

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return toast.error("Please enter a title.");
    if (!newTypeId) return toast.error("Please select an assessment type.");
    if (!newSubjectId) return toast.error("Please select a subject.");
    if (!newLevelId) return toast.error("Please select a grade level.");

    try {
      await createAssessment({
        title: newTitle,
        assessmentTypeId: newTypeId,
        subjectId: newSubjectId,
        levelId: newLevelId,
        termId: newTermId || null,
        weekNumber: newWeek ? parseInt(newWeek) : null,
        estimatedDurationMinutes: parseInt(newDuration) || 60,
        totalMarks: parseInt(newTotalMarks) || 100,
        status: "draft",
      }).unwrap();

      toast.success("Assessment created successfully!");
      setCreateDialogOpen(false);
      
      // Reset form
      setNewTitle("");
      setNewTypeId("");
      setNewSubjectId("");
      setNewLevelId("");
      setNewTermId("");
      setNewWeek("");
      setNewDuration("60");
      setNewTotalMarks("100");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to create assessment.");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishAssessment(id).unwrap();
      toast.success("Assessment published successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to publish assessment.");
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this assessment? It will hide it from active list views.")) return;
    try {
      await archiveAssessment(id).unwrap();
      toast.success("Assessment archived.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to archive assessment.");
    }
  };

  const openAssignDialog = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setAssignDialogOpen(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "published":
        return "bg-success/10 text-success border-success/20";
      case "archived":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground dark:text-white flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Assessment Platform
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build, publish, and assign assessments, or manage student attempts and marking.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="h-11 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Assessment
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs"
          />
        </div>

        {/* Subject Filter */}
        <div className="w-[160px]">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Level Filter */}
        <div className="w-[160px]">
          <Select value={levelId} onValueChange={setLevelId}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-[140px]">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Assessments Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search filters or click &quot;Create Assessment&quot; to start building your first paper.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Badges and Top Actions */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
                    {item.status}
                  </span>
                  {item.subject && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                      {item.subject.name}
                    </span>
                  )}
                  {item.level && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {item.level.name}
                    </span>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem asChild className="text-xs font-medium cursor-pointer">
                      <Link href={`/assessments/${item.id}`}>
                        Builder Workspace
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-xs font-medium cursor-pointer">
                      <Link href={`/assessments/${item.id}/marking`}>
                        Marking Queue
                      </Link>
                    </DropdownMenuItem>
                    {item.status === "draft" && (
                      <DropdownMenuItem
                        onClick={() => handlePublish(item.id)}
                        className="text-xs font-medium cursor-pointer text-success"
                      >
                        Publish Paper
                      </DropdownMenuItem>
                    )}
                    {item.status !== "archived" && (
                      <DropdownMenuItem
                        onClick={() => handleArchive(item.id)}
                        className="text-xs font-medium cursor-pointer text-destructive"
                      >
                        Archive Paper
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Title & Metadata */}
              <div>
                <h3 className="text-base font-bold text-foreground line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Type: {item.assessmentType?.name || "Standard Evaluation"}
                </p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/80">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Duration</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-foreground mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.estimatedDurationMinutes}m
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Max Marks</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-foreground mt-0.5">
                      <Award className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.totalMarks}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Term</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-foreground mt-0.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.term?.name || `Wk ${item.weekNumber || "-"}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex gap-2 w-full">
                <Link href={`/assessments/${item.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full h-9 rounded-xl text-[11px] font-bold border-border"
                  >
                    Edit Builder
                  </Button>
                </Link>
                {item.status === "published" ? (
                  <Button
                    onClick={() => openAssignDialog(item)}
                    className="flex-1 h-9 rounded-xl bg-primary text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    <GraduationCap className="mr-1 h-3.5 w-3.5" /> Assign
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePublish(item.id)}
                    className="flex-1 h-9 rounded-xl bg-success text-[11px] font-bold text-success-foreground hover:bg-success/90"
                  >
                    Publish
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Assessment Paper
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-3">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paper Title
              </Label>
              <Input
                placeholder="e.g. Calculus Mid-Term Examination"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/30"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assessment Type
                </Label>
                <Select value={newTypeId} onValueChange={setNewTypeId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
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

              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject
                </Label>
                <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
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

              {/* Level */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Grade Level
                </Label>
                <Select value={newLevelId} onValueChange={setNewLevelId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {levels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Term */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Term / Period
                </Label>
                <Select value={newTermId} onValueChange={setNewTermId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
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
              {/* Week */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Week No
                </Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={newWeek}
                  onChange={(e) => setNewWeek(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/30"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Duration (mins)
                </Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/30"
                  required
                />
              </div>

              {/* Max Score */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Max Marks
                </Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={newTotalMarks}
                  onChange={(e) => setNewTotalMarks(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/30"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assignment Wizard */}
      <AssignmentWizardDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        assessment={selectedAssessment}
      />
    </div>
  );
}
