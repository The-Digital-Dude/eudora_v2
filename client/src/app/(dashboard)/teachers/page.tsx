"use client";

import { Briefcase, Mail, Plus, Search, Trash2, Users2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useDeleteTeacherProfileMutation,
  useGetTeacherProfilesQuery,
} from "@/features/dashboard/dashboardApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

const PAGE_SIZE = 20;

export default function TeachersPage() {
  const router = useRouter();
  const { values, setValue } = useListQueryState(
    { search: "", status: "all", page: 1 },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  // Queries & Mutations
  // Filtering and paging both happen server-side. This list used to call the endpoint with no
  // arguments, taking its default first 10 rows and filtering within them — so an 11th teacher was
  // invisible, with no pagination control to hint that anything had been left out.
  const { data: teachersData, isLoading: teachersLoading } = useGetTeacherProfilesQuery({
    page: values.page,
    limit: PAGE_SIZE,
    search: values.search || undefined,
    status: values.status === "all" ? undefined : values.status,
  });

  // Registry-wide metrics, deliberately independent of the current page and filter — the cards
  // describe the whole registry. limit:1 keeps each of these to essentially a count query.
  const { data: allTeachersMeta } = useGetTeacherProfilesQuery({ limit: 1 });
  const { data: activeTeachersMeta } = useGetTeacherProfilesQuery({ limit: 1, status: "ACTIVE" });
  const { data: leaveTeachersMeta } = useGetTeacherProfilesQuery({ limit: 1, status: "ON_LEAVE" });

  const [deleteTeacherProfile] = useDeleteTeacherProfileMutation();

  // Delete Teacher Profile (Soft Delete)
  const handleDeleteProfile = async (id: string) => {
    if (confirm("Are you sure you want to deactivate and remove this teacher?")) {
      try {
        await deleteTeacherProfile(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to delete teacher.");
      }
    }
  };

  // Rows for the current page — already filtered by the server, so no client-side pass here.
  const filteredTeachers = teachersData?.items || [];
  const totalMatching = teachersData?.total ?? 0;
  const isFiltered = Boolean(values.search) || values.status !== "all";

  const totalCount = allTeachersMeta?.total ?? 0;
  const activeCount = activeTeachersMeta?.total ?? 0;
  const leaveCount = leaveTeachersMeta?.total ?? 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Teachers Registry
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Administer teacher profiles, academic specializations, and homeroom section assignments.
          </p>
        </div>
        <Button
          asChild
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90"
        >
          <Link href="/teachers/create">
            <Plus className="h-4 w-4" /> Add Teacher
          </Link>
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Total Teachers
            </span>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {teachersLoading ? "..." : totalCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Registered staff profiles</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Active Staff
            </span>
            <Users2 className="h-4 w-4 text-success" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {teachersLoading ? "..." : activeCount}
          </p>
          <p className="text-[10px] font-semibold text-success">
            Currently teaching active classes
          </p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              On Leave
            </span>
            <Users2 className="h-4 w-4 text-warning" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {teachersLoading ? "..." : leaveCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Temporary administrative leave</p>
        </Card>
      </div>

      {/* Teachers Directory Card */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Teachers Directory</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              value={values.status}
              onChange={(e) => setValue("status", e.target.value)}
              className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ON_LEAVE">ON LEAVE</option>
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder="Search by name or subject..."
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Teacher Profile
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Employee Code
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Specialization
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Assigned Sections
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {teachersLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher: any) => {
                  const initials = teacher.fullName
                    ? teacher.fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "T";

                  return (
                    <tr
                      key={teacher.id}
                      onClick={() => router.push(`/teachers/${teacher.id}`)}
                      className="cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-xs font-bold text-background">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {teacher.fullName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Mail className="h-3 w-3 text-muted-foreground" /> {teacher.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-mono text-xs text-muted-foreground">
                        {teacher.employeeCode || "N/A"}
                      </td>
                      <td className="py-4 text-xs font-medium text-foreground">
                        {teacher.specialization ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />{" "}
                            {teacher.specialization}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </td>
                      <td className="py-4 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            teacher.status === "ACTIVE"
                              ? "border border-success/20 bg-success/10 text-success"
                              : teacher.status === "ON_LEAVE"
                                ? "border border-warning/20 bg-warning/10 text-warning"
                                : "border border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          {teacher.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {teacher.classAssignments && teacher.classAssignments.length > 0 ? (
                            teacher.classAssignments.map((a: any) => (
                              <span
                                key={a.classSectionId}
                                className="inline-flex items-center rounded-md border border-success/10 bg-success/10 px-2 py-0.5 text-[9px] font-semibold text-success"
                              >
                                {a.classSection?.name} ({a.role})
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-medium text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProfile(teacher.id);
                            }}
                            variant="outline"
                            className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-medium text-muted-foreground">
                    {isFiltered
                      ? "No teachers match these filters."
                      : "No teacher profiles listed. Add a new teacher profile to get started."}
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
          label="teacher"
        />
      </Card>
    </div>
  );
}
