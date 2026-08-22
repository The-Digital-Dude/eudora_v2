"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { BookOpen, GraduationCap, Mail, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable, SortableHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type StudentProfile,
  useDeleteStudentProfileMutation,
  useGetStudentProfilesQuery,
  useRestoreStudentProfileMutation,
} from "@/features/dashboard/dashboardApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

export default function StudentsPage() {
  const router = useRouter();
  const { values, setValue, setValues } = useListQueryState(
    { search: "", status: "all", archived: "no", page: 1, pageSize: 10, sortBy: "", sortOrder: "asc" },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );
  const showArchived = values.archived === "yes";

  // Queries & Mutations
  const { data: studentsData, isLoading: studentsLoading } = useGetStudentProfilesQuery({
    page: values.page,
    limit: values.pageSize,
    includeArchived: showArchived,
    search: values.search || undefined,
    status: values.status === "all" ? undefined : values.status,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });
  const [deleteStudentProfile] = useDeleteStudentProfileMutation();
  const [restoreStudentProfile] = useRestoreStudentProfileMutation();

  // Archive Student Profile (soft delete — restorable from "Show archived")
  const handleDeleteProfile = async (id: string) => {
    if (
      confirm(
        "Archive this student profile? Their learning history is kept and the profile can be restored later.",
      )
    ) {
      try {
        await deleteStudentProfile(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to archive student profile.");
      }
    }
  };

  const handleRestoreProfile = async (id: string) => {
    try {
      await restoreStudentProfile(id).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || "Failed to restore student profile.");
    }
  };

  // Rows for the current page — search and status are applied server-side.
  const filteredStudents = studentsData?.items || [];
  const totalMatching = studentsData?.total ?? 0;
  const isFiltered = Boolean(values.search) || values.status !== "all";

  // Roster-wide totals, counted by the server rather than derived from the loaded page.
  const totalCount = totalMatching;
  const activePlacements = studentsData?.stats.placedStudents ?? 0;
  const activeEnrollments = studentsData?.stats.enrollmentTotal ?? 0;

  const columns: ColumnDef<StudentProfile, any>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <SortableHeader column={column} label="Student Profile" />,
      cell: ({ row }) => {
        const student = row.original;
        const initials = student.fullName
          ? student.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "S";
        return (
          <div className="flex items-center gap-3">
            <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{student.fullName}</p>
              <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Mail className="h-3 w-3 text-muted-foreground/50" /> {student.user?.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "gender",
      header: ({ column }) => <SortableHeader column={column} label="Gender" />,
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {row.original.gender?.toLowerCase()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              status === "ACTIVE"
                ? "border border-success/20 bg-success/10 text-success"
                : status === "GRADUATED"
                  ? "border border-border bg-muted text-muted-foreground"
                  : "border border-warning/20 bg-warning/10 text-warning"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      id: "academicRoute",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Academic Route
        </span>
      ),
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="max-w-[200px] space-y-1">
            {student.placements && student.placements.length > 0
              ? student.placements.map((p) => (
                  <div
                    key={p.classSectionId}
                    className="mr-1 inline-flex items-center gap-1 rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-[9px] font-semibold text-success"
                  >
                    Section: {p.classSection?.name || "N/A"}
                  </div>
                ))
              : null}
            {student.enrollments && student.enrollments.length > 0
              ? student.enrollments.map((e) => (
                  <div
                    key={e.id}
                    className="mr-1 inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary"
                  >
                    Course: {e.batch?.name || "N/A"}
                  </div>
                ))
              : null}
            {!student.placements?.length && !student.enrollments?.length && (
              <span className="text-[9px] font-medium text-muted-foreground">Unscheduled</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Actions
        </span>
      ),
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            {student.deletedAt ? (
              <>
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                  Archived
                </span>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestoreProfile(student.id);
                  }}
                  variant="outline"
                  className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Restore
                </Button>
              </>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProfile(student.id);
                }}
                variant="outline"
                className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Students
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Administer student profiles, class section placements, and course enrollment registers.
          </p>
        </div>
        <Button
          asChild
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-foreground/90"
        >
          <Link href="/students/create">
            <Plus className="h-4 w-4" /> Add Student
          </Link>
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Total Roster
            </span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {studentsLoading ? "..." : totalCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Registered student profiles</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Placed Sections
            </span>
            <GraduationCap className="h-4 w-4 text-success" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {studentsLoading ? "..." : activePlacements}
          </p>
          <p className="text-[10px] font-semibold text-success">Assigned homeroom sections</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Subject Enrollments
            </span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {studentsLoading ? "..." : activeEnrollments}
          </p>
          <p className="text-[10px] text-muted-foreground">Active class registries</p>
        </Card>
      </div>

      {/* Roster Directory list */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Student Directory</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setValue("archived", e.target.checked ? "yes" : "no")}
                className="h-3.5 w-3.5 cursor-pointer accent-primary"
              />
              Show archived
            </label>
            <select
              value={values.status}
              onChange={(e) => setValue("status", e.target.value)}
              className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder="Search by student name..."
              />
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredStudents}
          isLoading={studentsLoading}
          page={values.page}
          pageSize={values.pageSize}
          total={totalMatching}
          onPageChange={(next) => setValue("page", next)}
          onPageSizeChange={(size) => setValue("pageSize", size)}
          paginationLabel="student"
          sortBy={values.sortBy}
          sortOrder={values.sortOrder as "asc" | "desc"}
          onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
          onRowClick={(student) => router.push(`/students/${student.id}`)}
          emptyTitle={isFiltered ? "No matching students" : "No students found"}
          emptyDescription={
            isFiltered
              ? "No students match these filters. Try clearing the search or status filter."
              : "Register a new student to begin schedule setups."
          }
          emptyAction={
            isFiltered ? undefined : (
              <Button size="sm" asChild>
                <Link href="/students/create">Add Student</Link>
              </Button>
            )
          }
        />
      </Card>
    </div>
  );
}
