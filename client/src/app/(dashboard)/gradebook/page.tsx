"use client";

import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Info,
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
  useCreateManualGradeMutation,
  useGetGradebookForClassQuery,
  useGetStudentGradesQuery,
  useGetStudentSummaryQuery,
  useSyncGradesMutation,
  useUpdateGradeEntryMutation,
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
  const courseClasses = courseClassesData?.items || [];

  const { data: termsData } = useGetTermsQuery({ page: 1, limit: 100 });
  const termsList = termsData?.items || [];

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
      return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-900";
    if (c === "ASSESSMENT" || c === "EXAM")
      return "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-900";
    if (c === "PROJECT")
      return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900";
    return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900";
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
            <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
              <GraduationCap className="h-7 w-7 text-violet-500" />
              Report Card & Academic Ledger
            </h1>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
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
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
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
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
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
          <Card className="relative overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="absolute top-4 right-4 rounded-xl bg-violet-500/10 p-2 text-violet-500">
              <Award className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                Cumulative GPA
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-neutral-800 dark:text-neutral-100">
                {summary.gpa !== null ? `${summary.gpa.toFixed(2)}` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <Badge className="rounded-lg border border-violet-100 bg-violet-50 text-[9px] font-bold text-violet-600 dark:bg-violet-500/10">
                Grade: {summary.letterGrade}
              </Badge>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="absolute top-4 right-4 rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                Term Average Score
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-neutral-800 dark:text-neutral-100">
                {summary.termAverage !== null ? `${summary.termAverage}%` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-zinc-900">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${summary.termAverage ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="absolute top-4 right-4 rounded-xl bg-amber-500/10 p-2 text-amber-500">
              <User className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                Class Section Rank
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-neutral-800 dark:text-neutral-100">
                {summary.classRank !== null ? `#${summary.classRank}` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                In homeroom roster
              </span>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="absolute top-4 right-4 rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                Class Percentile
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-black text-neutral-800 dark:text-neutral-100">
                {summary.classPercentile !== null ? `${summary.classPercentile}%` : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <Badge className="rounded-lg border border-blue-100 bg-blue-50 text-[9px] font-bold text-blue-600 dark:bg-blue-500/10">
                Top {summary.classPercentile !== null ? 100 - summary.classPercentile : "--"}% of
                class
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Categories performance list */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="space-y-4 rounded-3xl border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <h2 className="text-xs font-black tracking-wider text-neutral-900 uppercase dark:text-neutral-50">
                Category Performances
              </h2>
              <p className="mt-0.5 text-[10px] text-neutral-400">
                Average scores mapped across coursework types.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {Object.keys(summary.categoryAverages).length === 0 ? (
                <div className="py-8 text-center text-[11px] text-neutral-400">
                  No records compiled yet.
                </div>
              ) : (
                Object.entries(summary.categoryAverages).map(([cat, val]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-neutral-500 uppercase">{cat}</span>
                      <span className="text-neutral-800 dark:text-neutral-100">{val}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-violet-600"
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
            <Card className="overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="border-b border-neutral-100 p-5 dark:border-zinc-900">
                <h2 className="text-xs font-black tracking-wider text-neutral-900 uppercase dark:text-neutral-50">
                  Coursework Ledger
                </h2>
                <p className="mt-0.5 text-[10px] text-neutral-400">
                  Individual course tasks and scores.
                </p>
              </div>

              {isLoadingStudentGrades ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  Loading grade history...
                </div>
              ) : listToRender.length === 0 ? (
                <div className="py-16 text-center text-xs text-neutral-400">
                  No published grades found for this term.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-neutral-500">
                        <th className="px-6 py-3">Task Title</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3 text-center">Percentage</th>
                        <th className="px-6 py-3 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs text-neutral-700 dark:divide-zinc-800 dark:text-neutral-300">
                      {listToRender.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-neutral-50/20 dark:hover:bg-zinc-900/10"
                        >
                          <td className="px-6 py-4 font-bold text-neutral-800 dark:text-neutral-200">
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
                          <td className="px-6 py-4 text-center font-bold text-neutral-800 dark:text-neutral-200">
                            {entry.percentage !== null ? `${Math.round(entry.percentage)}%` : "--"}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-neutral-500 dark:text-neutral-400">
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
          <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
            <ClipboardList className="h-7 w-7 text-rose-500" />
            Class Gradebook Workspace
          </h1>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Review coursework ledgers, enter manual points, and sync grades.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleSyncSourceGrades}
            disabled={isSyncing}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-neutral-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Grades
          </Button>

          <Button
            size="sm"
            onClick={() => setAddColumnDialogOpen(true)}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-neutral-200"
          >
            <Plus className="h-3.5 w-3.5 text-rose-500" />
            Add Manual Column
          </Button>

          <Button
            size="sm"
            onClick={handleSaveGrid}
            disabled={isSavingBulk}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
          >
            <Save className="h-3.5 w-3.5" />
            {isSavingBulk ? "Saving..." : "Save Gradebook"}
          </Button>
        </div>
      </div>

      {/* Control panel toolbar filters */}
      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
            Subject Course Class
          </Label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
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
          <Label className="text-xs font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
            Semester Term
          </Label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
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
      <Card className="overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {isLoadingGradebook ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            Loading gradebook sheet...
          </div>
        ) : !gradebookData || gradebookData.students.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            No students enrolled in this course class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-neutral-800 dark:text-neutral-200">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/60 text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-neutral-500">
                  <th className="sticky left-0 z-10 min-w-[200px] border-r border-neutral-100 bg-neutral-100/40 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                    Student Profile
                  </th>
                  {allColumns.map((col) => (
                    <th
                      key={col.colKey}
                      className="min-w-[150px] border-r border-neutral-100 px-4 py-3 text-center dark:border-zinc-800"
                    >
                      <span className="block truncate font-bold text-neutral-800 dark:text-neutral-200">
                        {col.title}
                      </span>
                      <span className="mt-1 block text-[8px] font-semibold text-neutral-400 dark:text-neutral-500">
                        {col.category} ({col.pointsPossible} pts)
                      </span>
                    </th>
                  ))}
                  {allColumns.length === 0 && (
                    <th className="px-4 py-3 text-center text-neutral-400">
                      No coursework records found. Add a column or click sync to populate.
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                {gradebookData.students.map((student) => {
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-neutral-50/40 dark:hover:bg-zinc-900/10"
                    >
                      {/* Left student frozen column */}
                      <td className="sticky left-0 z-10 border-r border-neutral-100 bg-white px-6 py-3 font-bold shadow-[2px_0_5px_rgba(0,0,0,0.02)] dark:border-zinc-800 dark:bg-zinc-950">
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
                            className="border-r border-neutral-100 px-4 py-2.5 text-center dark:border-zinc-800"
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
                                  className="h-8 w-16 rounded-lg border-neutral-200 text-center text-xs font-bold focus:ring-rose-500 dark:border-zinc-800"
                                />
                                <span className="ml-1.5 text-[10px] font-semibold text-neutral-400">
                                  / {col.pointsPossible}
                                </span>
                              </div>
                            ) : (
                              <span className="font-semibold text-neutral-600 dark:text-neutral-400">
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
                        <td className="px-4 py-4 text-center text-neutral-400 italic">--</td>
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
        <DialogContent className="max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-50">
              <Plus className="h-5 w-5 text-rose-500" />
              Add Manual Grade Item
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Create a custom manual gradebook column for items like midterms, finals, or
              participation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddColumn} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Column Header Name
              </Label>
              <Input
                type="text"
                placeholder="e.g. Midterm Presentation"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Category
              </Label>
              <select
                value={newColCategory}
                onChange={(e) => setNewColCategory(e.target.value)}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
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
                <Label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Max Points
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={newColPointsPossible}
                  onChange={(e) => setNewColPointsPossible(Number(e.target.value))}
                  className="h-10 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Weight Factor
                </Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={newColWeight}
                  onChange={(e) => setNewColWeight(Number(e.target.value))}
                  className="h-10 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Student Visibility Status
              </Label>
              <select
                value={newColStatus}
                onChange={(e) => setNewColStatus(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
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
                className="h-10 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
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
