"use client";

import { BookOpen, GraduationCap, Mail, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import {
  useDeleteStudentProfileMutation,
  useGetStudentProfilesQuery,
  useRestoreStudentProfileMutation,
} from "@/features/dashboard/dashboardApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

const PAGE_SIZE = 20;

export default function StudentsPage() {
  const router = useRouter();
  const { values, setValue } = useListQueryState(
    { search: "", status: "all", archived: "no", page: 1 },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );
  const showArchived = values.archived === "yes";

  // Queries & Mutations
  const { data: studentsData, isLoading: studentsLoading } = useGetStudentProfilesQuery({
    page: values.page,
    limit: PAGE_SIZE,
    includeArchived: showArchived,
    search: values.search || undefined,
    status: values.status === "all" ? undefined : values.status,
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

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Student Roster
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

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Student Profile
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Gender</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Academic Route
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student: any) => {
                  const initials = student.fullName
                    ? student.fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "S";

                  return (
                    <tr
                      key={student.id}
                      onClick={() => router.push(`/students/${student.id}`)}
                      className="cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {student.fullName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Mail className="h-3 w-3 text-muted-foreground/50" /> {student.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-xs font-medium text-muted-foreground capitalize">
                        {student.gender?.toLowerCase()}
                      </td>
                      <td className="py-4 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            student.status === "ACTIVE"
                              ? "border border-success/20 bg-success/10 text-success"
                              : student.status === "GRADUATED"
                                ? "border border-border bg-muted text-muted-foreground"
                                : "border border-warning/20 bg-warning/10 text-warning"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="max-w-[200px] space-y-1">
                          {student.placements && student.placements.length > 0
                            ? student.placements.map((p: any) => (
                                <div
                                  key={p.classSectionId}
                                  className="mr-1 inline-flex items-center gap-1 rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-[9px] font-semibold text-success"
                                >
                                  Section: {p.classSection?.name || "N/A"}
                                </div>
                              ))
                            : null}
                          {student.enrollments && student.enrollments.length > 0
                            ? student.enrollments.map((e: any) => (
                                <div
                                  key={e.id}
                                  className="mr-1 inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary"
                                >
                                  Course: {e.courseClass?.name || "N/A"}
                                </div>
                              ))
                            : null}
                          {!student.placements?.length && !student.enrollments?.length && (
                            <span className="text-[9px] font-medium text-muted-foreground">
                              Unscheduled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
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
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-4">
                    <DataState
                      isLoading={false}
                      isEmpty={filteredStudents.length === 0}
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
                    >
                      {null}
                    </DataState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          page={values.page}
          pageSize={PAGE_SIZE}
          total={totalMatching}
          onPageChange={(next) => setValue("page", next)}
          label="student"
        />
      </Card>
    </div>
  );
}
