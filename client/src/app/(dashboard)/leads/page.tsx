"use client";

import { Mail, Phone, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDeleteLeadMutation, useGetLeadsQuery } from "@/features/dashboard/dashboardApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

const PAGE_SIZE = 20;

export default function LeadsPage() {
  const router = useRouter();
  const { values, setValue } = useListQueryState({ search: "", page: 1 }, { pageKey: "page" });
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  // RTK Queries & Mutations
  const { data: leadsData, isLoading } = useGetLeadsQuery({
    page: values.page,
    limit: PAGE_SIZE,
    search: values.search || undefined,
  });

  // Pipeline metrics describe the whole funnel, so they're counted server-side rather than derived
  // from whichever page is on screen. limit:1 makes each of these effectively just a count.
  const { data: allLeadsMeta } = useGetLeadsQuery({ limit: 1 });
  const { data: diagnosticLeadsMeta } = useGetLeadsQuery({
    limit: 1,
    status: "Diagnostic Scheduled",
  });
  const { data: enrolledLeadsMeta } = useGetLeadsQuery({ limit: 1, status: "Enrolled" });
  const [deleteLead] = useDeleteLeadMutation();

  const handleDeleteLead = async (id: string) => {
    if (confirm("Are you sure you want to remove this lead?")) {
      try {
        await deleteLead(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to delete lead.");
      }
    }
  };

  // Metrics calculation
  const totalLeads = allLeadsMeta?.total ?? 0;
  const diagnosticsBooked = diagnosticLeadsMeta?.total ?? 0;
  const enrolledCount = enrolledLeadsMeta?.total ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((enrolledCount / totalLeads) * 100) : 0;

  // Rows for the current page — the server has already applied the search.
  const filteredLeads = leadsData?.items || [];
  const totalMatching = leadsData?.total ?? 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Leads & Enrolments
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track interest, onboard prospective students, and coordinate enroled classes.
          </p>
        </div>
        <Button
          asChild
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90 active:scale-98"
        >
          <Link href="/leads/create">
            <Plus className="h-4 w-4" /> Add Lead
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border border-border bg-card p-4">
          <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Total Leads
          </CardDescription>
          <CardTitle className="font-display mt-1 text-2xl font-bold text-foreground">
            {isLoading ? "..." : totalLeads}
          </CardTitle>
          <p className="mt-1 flex items-center gap-0.5 text-[10px] text-muted-foreground">
            Registered interest list
          </p>
        </Card>
        <Card className="rounded-2xl border border-border bg-card p-4">
          <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Diagnostics Booked
          </CardDescription>
          <CardTitle className="font-display mt-1 text-2xl font-bold text-foreground">
            {isLoading ? "..." : diagnosticsBooked}
          </CardTitle>
          <p className="mt-1 text-[10px] text-muted-foreground">Awaiting academic assessment</p>
        </Card>
        <Card className="rounded-2xl border border-border bg-card p-4">
          <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Conversion Rate
          </CardDescription>
          <CardTitle className="font-display mt-1 text-2xl font-bold text-foreground">
            {isLoading ? "..." : `${conversionRate}%`}
          </CardTitle>
          <p className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-success">
            <TrendingUp className="h-3.5 w-3.5" /> {enrolledCount} enrolled students
          </p>
        </Card>
      </div>

      {/* Leads Table Card */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">
            Active Interest Pipelines
          </h2>
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
            </span>
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-9 pl-9 text-xs"
              placeholder="Search leads..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Name</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Source</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="ml-auto h-4 w-10 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{lead.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-0.5">
                              | <Phone className="h-3 w-3" /> {lead.phone}
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{lead.source}</td>
                    <td className="py-3 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          lead.status === "Enrolled"
                            ? "border border-success/20 bg-success/10 text-success"
                            : lead.status === "New"
                              ? "border border-primary/20 bg-primary/10 text-primary"
                              : lead.status === "Diagnostic Scheduled"
                                ? "border border-warning/20 bg-warning/10 text-warning"
                                : "border border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(lead.id);
                          }}
                          variant="outline"
                          className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs font-medium text-muted-foreground">
                    No leads listed. Click &quot;Add Lead&quot; to register prospective interests.
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
          label="lead"
        />
      </Card>
    </div>
  );
}
