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
  Search} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Assessment,
  useArchiveAssessmentMutation,
  useGetAssessmentsQuery,
  usePublishAssessmentMutation,
} from "@/features/assessments/assessmentsApi";
import {
  useGetClassesQuery,
  useGetSubjectsQuery,
} from "@/features/assessments/questionsApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

import { AssignmentWizardDialog } from "./components/assignment-wizard-dialog";

const PAGE_SIZE = 12;

export default function AssessmentsPage() {
  // Query filters, held in the URL so a filtered view can be linked or refreshed. `page` used to be
  // a useState whose setter was never destructured, pinning this list to page 1 despite the API
  // paginating properly behind it.
  const { values, setValue, setValues } = useListQueryState(
    {
      search: "",
      subjectId: "all",
      classId: "all",
      status: "all",
      page: 1,
      sortBy: "",
      sortOrder: "asc",
    },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  // Queries
  const { data: assessmentsData, isLoading } = useGetAssessmentsQuery({
    search: values.search || undefined,
    subjectId: values.subjectId === "all" ? undefined : values.subjectId,
    classId: values.classId === "all" ? undefined : values.classId,
    status: values.status === "all" ? undefined : values.status,
    page: values.page,
    pageSize: PAGE_SIZE,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });

  // Cards, not table rows — the sort control is a select rather than a clickable column header.
  const sortValue = values.sortBy ? `${values.sortBy}:${values.sortOrder}` : "createdAt:desc";
  const handleSortChange = (next: string) => {
    const [sortBy, sortOrder] = next.split(":");
    setValues({ sortBy: sortBy === "createdAt" ? "" : sortBy, sortOrder });
  };

  const { data: subjectsData } = useGetSubjectsQuery();
  const { data: classesData } = useGetClassesQuery();

  const assessments = assessmentsData?.items || [];
  const subjects = subjectsData?.items || [];
  const classes = classesData?.items || [];

  // Mutations
  const [publishAssessment] = usePublishAssessmentMutation();
  const [archiveAssessment] = useArchiveAssessmentMutation();

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Assessment Platform
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build, publish, and assign assessments, or manage student attempts and marking.
          </p>
        </div>
        <Button
          asChild
          className="h-11 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          <Link href="/assessments/create">
            <Plus className="mr-2 h-4 w-4" /> Create Assessment
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs"
          />
        </div>

        {/* Subject Filter */}
        <div className="w-[160px]">
          <Select value={values.subjectId} onValueChange={(next) => setValue("subjectId", next)}>
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
          <Select value={values.classId} onValueChange={(next) => setValue("classId", next)}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Levels</SelectItem>
              {classes.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-[140px]">
          <Select value={values.status} onValueChange={(next) => setValue("status", next)}>
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

        {/* Sort */}
        <div className="w-[170px]">
          <Select value={sortValue} onValueChange={handleSortChange}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/30">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="createdAt:desc">Newest first</SelectItem>
              <SelectItem value="createdAt:asc">Oldest first</SelectItem>
              <SelectItem value="title:asc">Title A–Z</SelectItem>
              <SelectItem value="title:desc">Title Z–A</SelectItem>
              <SelectItem value="totalMarks:desc">Most marks</SelectItem>
              <SelectItem value="totalMarks:asc">Fewest marks</SelectItem>
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
                  {item.class && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {item.class.name}
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

      <ListPagination
        page={values.page}
        pageSize={PAGE_SIZE}
        total={assessmentsData?.total ?? 0}
        onPageChange={(next) => setValue("page", next)}
        label="assessment"
      />

      {/* Assignment Wizard */}
      <AssignmentWizardDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        assessment={selectedAssessment}
      />
    </div>
  );
}
