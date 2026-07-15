"use client";

import {
  Award,
  ClipboardList,
  GraduationCap,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent,CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useBulkUpsertGradesMutation,
  useGetGradebookForClassQuery,
  useGetStudentGradesQuery,
  useGetStudentSummaryQuery,
  useSyncGradesMutation,
} from "@/features/academic/gradebookApi";
import { useGetTermsQuery } from "@/features/academic/timetableApi";
import { useGetCourseClassesQuery } from "@/features/dashboard/dashboardApi";
import { useAppSelector } from "@/store/hooks";

export default function GradebookPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  // Resolve user roles
  const userRoles = React.useMemo<string[]>(() => {
    if (!user) return [];
    const rolesList: string[] = [];
    if (user.role) rolesList.push(user.role);
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (typeof r === "string") rolesList.push(r);
        else if (r?.name) rolesList.push(r.name);
        else if (r?.role?.name) rolesList.push(r.role?.name);
      });
    }
    return rolesList;
  }, [user]);

  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  const isTeacher = userRoles.includes("TEACHER");
  const isStudent = userRoles.includes("USER") && user?.studentProfile;
  const isGuardian = userRoles.includes("GUARDIAN") && user?.guardianProfile;

  // 1. TEACHER / ADMIN WORKSPACE STATES
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedTermId, setSelectedTermId] = React.useState<string>("");
  const [addColumnDialogOpen, setAddColumnDialogOpen] = React.useState(false);

  // New manual column fields
  const [newColTitle, setNewColTitle] = React.useState("");
  const [newColCategory, setNewColCategory] = React.useState("GENERAL");
  const [newColPointsPossible, setNewColPointsPossible] = React.useState(100);
  const [newColWeight, setNewColWeight] = React.useState(1.0);
  const [newColStatus, setNewColStatus] = React.useState<"DRAFT" | "PUBLISHED">("DRAFT");

  // Client side transient columns that haven't been saved to DB yet
  const [clientColumns, setClientColumns] = React.useState<any[]>([]);

  // Local grid edits state: keys are `${studentProfileId}-${sourceType}-${sourceId}`
  const [editedCells, setEditedCells] = React.useState<
    Record<string, { pointsEarned?: number; notes?: string }>
  >({});

  // 2. STUDENT / GUARDIAN VIEW STATES
  const linkedStudents = user?.guardianProfile?.students || [];
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(
    linkedStudents[0]?.studentProfileId || "",
  );

  // Queries
  const { data: courseClassesData, isLoading: isLoadingClasses } = useGetCourseClassesQuery();
  const courseClasses = React.useMemo(() => courseClassesData?.items ?? [], [courseClassesData]);

  const { data: termsData } = useGetTermsQuery({ page: 1, limit: 100 });
  const termsList = React.useMemo(() => termsData?.items ?? [], [termsData]);

  // Default selections
  React.useEffect(() => {
    if (courseClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(courseClasses[0].id);
    }
  }, [courseClasses, selectedClassId]);

  React.useEffect(() => {
    if (termsList.length > 0 && !selectedTermId) {
      setSelectedTermId(termsList[0].id);
    }
  }, [termsList, selectedTermId]);

  // Load Gradebook Sheet Data (Teacher/Admin view)
  const { data: gradebookData, isLoading: isLoadingGradebook } = useGetGradebookForClassQuery(
    { courseClassId: selectedClassId, termId: selectedTermId },
    { skip: !selectedClassId || !selectedTermId || (!isAdmin && !isTeacher) },
  );

  // Load Student Specific Data (Student/Guardian view)
  const studentProfileId = isStudent ? user?.studentProfile?.id : selectedStudentId;
  const { data: studentGrades, isLoading: isLoadingStudentGrades } = useGetStudentGradesQuery(
    { studentProfileId, termId: selectedTermId },
    { skip: !studentProfileId || !selectedTermId },
  );

  const { data: studentSummary } = useGetStudentSummaryQuery(
    { studentProfileId, termId: selectedTermId },
    { skip: !studentProfileId || !selectedTermId },
  );

  // Mutations
  const [bulkUpsertGrades, { isLoading: isSavingBulk }] = useBulkUpsertGradesMutation();
  const [syncGrades, { isLoading: isSyncing }] = useSyncGradesMutation();

  // Clear client columns when class or term changes
  React.useEffect(() => {
    setClientColumns([]);
    setEditedCells({});
  }, [selectedClassId, selectedTermId]);

  // Compile unique columns from database entries
  const dbColumns = React.useMemo(() => {
    if (!gradebookData?.entries) return [];
    const map = new Map<string, any>();
    gradebookData.entries.forEach((e) => {
      const colKey = `${e.sourceType}-${e.sourceId}`;
      if (!map.has(colKey)) {
        map.set(colKey, {
          colKey,
          sourceType: e.sourceType,
          sourceId: e.sourceId,
          title: e.title,
          category: e.category,
          pointsPossible: e.pointsPossible,
          weight: e.weight,
          status: e.status,
        });
      }
    });
    return Array.from(map.values());
  }, [gradebookData]);

  // Combine database columns with transient client columns
  const allColumns = React.useMemo(() => {
    return [...dbColumns, ...clientColumns];
  }, [dbColumns, clientColumns]);

  // Build entry lookup map
  const entriesMap = React.useMemo(() => {
    if (!gradebookData?.entries) return new Map<string, any>();
    const map = new Map<string, any>();
    gradebookData.entries.forEach((e) => {
      const lookupKey = `${e.studentProfileId}-${e.sourceType}-${e.sourceId}`;
      map.set(lookupKey, e);
    });
    return map;
  }, [gradebookData]);

  // Handlers
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle) {
      toast.error("Please provide a title for the column");
      return;
    }

    const tempSourceId = `temp-${Date.now()}`;
    const newColKey = `MANUAL-${tempSourceId}`;

    const newCol = {
      colKey: newColKey,
      sourceType: "MANUAL",
      sourceId: tempSourceId,
      title: newColTitle,
      category: newColCategory,
      pointsPossible: newColPointsPossible,
      weight: newColWeight,
      status: newColStatus,
      isTransient: true,
    };

    setClientColumns((prev) => [...prev, newCol]);
    setAddColumnDialogOpen(false);
    setNewColTitle("");
    setNewColCategory("GENERAL");
    setNewColPointsPossible(100);
    setNewColWeight(1.0);
    setNewColStatus("DRAFT");
    toast.success(`Temporary column "${newColTitle}" added. Enter scores in the grid.`);
  };

  const handleCellChange = (studentProfileId: string, col: any, val: string) => {
    const cellKey = `${studentProfileId}-${col.sourceType}-${col.sourceId}`;
    const parsedVal = val === "" ? undefined : Number(val);
    setEditedCells((prev) => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        pointsEarned: parsedVal,
      },
    }));
  };

  const handleSaveGrid = async () => {
    const entriesToSave: any[] = [];

    // Loop through each student and column to see what needs to be saved
    if (!gradebookData?.students) return;

    gradebookData.students.forEach((student) => {
      allColumns.forEach((col) => {
        const cellKey = `${student.id}-${col.sourceType}-${col.sourceId}`;
        const edit = editedCells[cellKey];
        const dbEntry = entriesMap.get(cellKey);

        // If the cell was edited, or if it is a transient client column, compile a save payload
        if (edit !== undefined || col.isTransient) {
          const pointsEarned =
            edit?.pointsEarned !== undefined ? edit.pointsEarned : dbEntry?.pointsEarned;

          entriesToSave.push({
            studentProfileId: student.id,
            courseClassId: selectedClassId,
            classSectionId: dbEntry?.classSectionId || null,
            termId: selectedTermId,
            title: col.title,
            category: col.category,
            pointsEarned: pointsEarned !== undefined ? pointsEarned : null,
            pointsPossible: col.pointsPossible,
            weight: col.weight,
            status: col.status,
            sourceId: col.isTransient ? undefined : col.sourceId, // server creates UUID if transient
            notes: edit?.notes || dbEntry?.notes || undefined,
          });
        }
      });
    });

    if (entriesToSave.length === 0) {
      toast.info("No modifications detected in the gradebook sheet.");
      return;
    }

    try {
      await bulkUpsertGrades({ entries: entriesToSave }).unwrap();
      toast.success("Gradebook sheet updated successfully!");
      setEditedCells({});
      setClientColumns([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to update gradebook sheet.");
    }
  };

  const handleSyncSourceGrades = async () => {
    try {
      const res = await syncGrades().unwrap();
      toast.success(
        `Grades synchronized! Synced: ${res.homeworkSyncCount} homework entries, ${res.assessmentSyncCount} assessments.`,
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to sync grades from sources.");
    }
  };

  // --- RENDERS ---

  // Category Color Resolvers
  const getCategoryBadgeColor = (cat: string) => {
    const c = cat.toUpperCase();
    if (c === "HOMEWORK")
      return "bg-primary/10 text-primary border-primary/20";
    if (c === "ASSESSMENT" || c === "EXAM")
      return "bg-primary/10 text-primary border-primary/20";
    if (c === "PROJECT")
      return "bg-warning/10 text-warning border-warning/20";
    return "bg-success/10 text-success border-success/20";
  };

  // 1. STUDENT OR GUARDIAN DESK
  if (isStudent || isGuardian) {
    const listToRender = studentGrades || [];
    const summary = studentSummary || {
      categoryAverages: {},
      termAverage: null,
      gpa: null,
      letterGrade: "N/A",
      classRank: null,
      classPercentile: null,
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
              <GraduationCap className="h-7 w-7 text-primary" />
              Report Card & Academic Ledger
            </h1>
            <p className="text-xs font-medium text-muted-foreground">
              {isStudent
                ? "View your term grades, performance summaries, and GPA records."
                : "View your child's published coursework grades and evaluations."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Guardian Child selector */}
            {isGuardian && linkedStudents.length > 1 && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs focus:outline-none"
              >
                {linkedStudents.map((rel: any) => (
                  <option key={rel.studentProfileId} value={rel.studentProfileId}>
                    {rel.studentProfile?.fullName || "Child Profile"}
                  </option>
                ))}
              </select>
            )}

            {/* Term selector */}
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs focus:outline-none"
            >
              {termsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dashboard summary widgets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden rounded-3xl border-border bg-card shadow-sm">
            <div className="absolute top-4 right-4 rounded-xl bg-primary/10 p-2 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Cumulative GPA
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-foreground">
                {summary.gpa !== null ? `${summary.gpa.toFixed(2)}` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <Badge className="rounded-lg border border-primary/10 bg-primary/10 text-[9px] font-bold text-primary">
                Grade: {summary.letterGrade}
              </Badge>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border-border bg-card shadow-sm">
            <div className="absolute top-4 right-4 rounded-xl bg-success/10 p-2 text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Term Average Score
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-foreground">
                {summary.termAverage !== null ? `${summary.termAverage}%` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${summary.termAverage ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border-border bg-card shadow-sm">
            <div className="absolute top-4 right-4 rounded-xl bg-warning/10 p-2 text-warning">
              <User className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Class Section Rank
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-foreground">
                {summary.classRank !== null ? `#${summary.classRank}` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <span className="text-[10px] font-semibold text-muted-foreground">
                In homeroom roster
              </span>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border-border bg-card shadow-sm">
            <div className="absolute top-4 right-4 rounded-xl bg-primary/10 p-2 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Class Percentile
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-foreground">
                {summary.classPercentile !== null ? `${summary.classPercentile}%` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <Badge className="rounded-lg border border-primary/20 bg-primary/10 text-[9px] font-bold text-primary">
                Top {summary.classPercentile !== null ? 100 - summary.classPercentile : "--"}% of
                class
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Categories performance list */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="space-y-4 rounded-3xl border-border bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-xs font-black tracking-wider text-foreground uppercase">
                Category Performances
              </h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Average scores mapped across coursework types.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {Object.keys(summary.categoryAverages).length === 0 ? (
                <div className="py-8 text-center text-[11px] text-muted-foreground">
                  No records compiled yet.
                </div>
              ) : (
                Object.entries(summary.categoryAverages).map(([cat, val]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground uppercase">{cat}</span>
                      <span className="text-foreground">{val}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Graded elements list */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
              <div className="border-b border-border p-5">
                <h2 className="text-xs font-black tracking-wider text-foreground uppercase">
                  Coursework Ledger
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Individual course tasks and scores.
                </p>
              </div>

              {isLoadingStudentGrades ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading grade history...
                </div>
              ) : listToRender.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No published grades found for this term.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-[10px] font-bold tracking-wider text-muted-foreground uppercase/40">
                        <th className="px-6 py-3">Task Title</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3 text-center">Percentage</th>
                        <th className="px-6 py-3 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs text-foreground">
                      {listToRender.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-muted/20/10"
                        >
                          <td className="px-6 py-4 font-bold text-foreground">
                            {entry.title}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase ${getCategoryBadgeColor(entry.category)}`}
                            >
                              {entry.category}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-foreground">
                            {entry.percentage !== null ? `${Math.round(entry.percentage)}%` : "--"}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-muted-foreground">
                            {entry.pointsEarned !== null ? entry.pointsEarned : "--"} /{" "}
                            {entry.pointsPossible}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 2. TEACHER OR ADMIN WORKSPACE VIEW
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
            <ClipboardList className="h-7 w-7 text-destructive" />
            Class Gradebook Workspace
          </h1>
          <p className="text-xs font-medium text-muted-foreground">
            Review coursework ledgers, enter manual points, and sync grades.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleSyncSourceGrades}
            disabled={isSyncing}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-muted px-4 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Grades
          </Button>

          <Button
            size="sm"
            onClick={() => setAddColumnDialogOpen(true)}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-muted px-4 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5 text-destructive" />
            Add Manual Column
          </Button>

          <Button
            size="sm"
            onClick={handleSaveGrid}
            disabled={isSavingBulk}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-white hover:bg-foreground/90"
          >
            <Save className="h-3.5 w-3.5" />
            {isSavingBulk ? "Saving..." : "Save Gradebook"}
          </Button>
        </div>
      </div>

      {/* Control panel toolbar filters */}
      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Subject Course Class
          </Label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-xs text-foreground focus:outline-none/50"
          >
            {isLoadingClasses ? (
              <option>Loading course classes...</option>
            ) : (
              courseClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Semester Term
          </Label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-xs text-foreground focus:outline-none/50"
          >
            {termsList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
        {isLoadingGradebook ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Loading gradebook sheet...
          </div>
        ) : !gradebookData || gradebookData.students.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No students enrolled in this course class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-foreground">
              <thead>
                <tr className="border-b border-border bg-muted/50/60 text-[10px] font-bold tracking-wider text-muted-foreground uppercase/40">
                  <th className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-muted/40 px-6 py-3/40">
                    Student Profile
                  </th>
                  {allColumns.map((col) => (
                    <th
                      key={col.colKey}
                      className="min-w-[150px] border-r border-border px-4 py-3 text-center"
                    >
                      <span className="block truncate font-bold text-foreground">
                        {col.title}
                      </span>
                      <span className="mt-1 block text-[8px] font-semibold text-muted-foreground">
                        {col.category} ({col.pointsPossible} pts)
                      </span>
                    </th>
                  ))}
                  {allColumns.length === 0 && (
                    <th className="px-4 py-3 text-center text-muted-foreground">
                      No coursework records found. Add a column or click sync to populate.
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {gradebookData.students.map((student) => {
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-muted/30/10"
                    >
                      {/* Left student frozen column */}
                      <td className="sticky left-0 z-10 border-r border-border bg-card px-6 py-3 font-bold shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        {student.fullName}
                      </td>

                      {/* Grade values */}
                      {allColumns.map((col) => {
                        const cellKey = `${student.id}-${col.sourceType}-${col.sourceId}`;
                        const dbEntry = entriesMap.get(cellKey);
                        const isEdited = editedCells[cellKey] !== undefined;

                        const pointsEarned = isEdited
                          ? editedCells[cellKey].pointsEarned
                          : dbEntry?.pointsEarned;

                        const isManual = col.sourceType === "MANUAL";

                        return (
                          <td
                            key={col.colKey}
                            className="border-r border-border px-4 py-2.5 text-center"
                          >
                            {isManual ? (
                              <div className="flex items-center justify-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={col.pointsPossible}
                                  placeholder="--"
                                  value={
                                    pointsEarned !== undefined && pointsEarned !== null
                                      ? pointsEarned
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleCellChange(student.id, col, e.target.value)
                                  }
                                  className="h-8 w-16 rounded-lg border-border text-center text-xs font-bold focus:ring-destructive"
                                />
                                <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground">
                                  / {col.pointsPossible}
                                </span>
                              </div>
                            ) : (
                              <span className="font-semibold text-muted-foreground">
                                {dbEntry?.pointsEarned !== undefined &&
                                dbEntry?.pointsEarned !== null
                                  ? `${dbEntry.pointsEarned} / ${col.pointsPossible}`
                                  : "--"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {allColumns.length === 0 && (
                        <td className="px-4 py-4 text-center text-muted-foreground italic">--</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manual Column Creation Dialog */}
      <Dialog open={addColumnDialogOpen} onOpenChange={setAddColumnDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Plus className="h-5 w-5 text-destructive" />
              Add Manual Grade Item
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a custom manual gradebook column for items like midterms, finals, or
              participation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddColumn} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Column Header Name
              </Label>
              <Input
                type="text"
                placeholder="e.g. Midterm Presentation"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                className="h-10 rounded-xl border-border bg-muted/50 text-xs/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Category
              </Label>
              <select
                value={newColCategory}
                onChange={(e) => setNewColCategory(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted/50 px-3 text-xs text-foreground focus:outline-none/50"
              >
                <option value="GENERAL">General</option>
                <option value="HOMEWORK">Homework</option>
                <option value="ASSESSMENT">Assessment / Test</option>
                <option value="PROJECT">Project / Labs</option>
                <option value="PARTICIPATION">Participation</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Max Points
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={newColPointsPossible}
                  onChange={(e) => setNewColPointsPossible(Number(e.target.value))}
                  className="h-10 rounded-xl border-border bg-muted/50 text-xs/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Weight Factor
                </Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={newColWeight}
                  onChange={(e) => setNewColWeight(Number(e.target.value))}
                  className="h-10 rounded-xl border-border bg-muted/50 text-xs/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Student Visibility Status
              </Label>
              <select
                value={newColStatus}
                onChange={(e) => setNewColStatus(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-border bg-muted/50 px-3 text-xs text-foreground focus:outline-none/50"
              >
                <option value="DRAFT">Draft (Hidden from students)</option>
                <option value="PUBLISHED">Published (Visible on report cards)</option>
              </select>
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddColumnDialogOpen(false)}
                className="h-10 cursor-pointer rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-white hover:bg-foreground/90"
              >
                Add Column
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
