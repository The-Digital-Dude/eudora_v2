"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Layers, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTable, SortableHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type PlacementRecommendation,
  type PlacementRecStatus,
  useDecidePlacementRecommendationMutation,
  useListPlacementRecommendationsQuery,
} from "@/features/academic/placementRecommendationsApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

const STATUS_VARIANT: Record<PlacementRecStatus, "outline" | "secondary" | "default"> = {
  SUGGESTED: "outline",
  ACCEPTED: "default",
  OVERRIDDEN: "secondary",
};

export default function PlacementPage() {
  const { values, setValue, setValues } = useListQueryState(
    { search: "", status: "SUGGESTED", page: 1, pageSize: 10, sortBy: "", sortOrder: "asc" },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  const { data: recommendationsData, isLoading } = useListPlacementRecommendationsQuery({
    status: values.status === "ALL" ? undefined : (values.status as PlacementRecStatus),
    search: values.search || undefined,
    page: values.page,
    limit: values.pageSize,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });
  const recommendations = recommendationsData?.items ?? [];
  const total = recommendationsData?.total ?? 0;

  const [decide, { isLoading: isDeciding }] = useDecidePlacementRecommendationMutation();

  const handleDecide = async (id: string, status: "ACCEPTED" | "OVERRIDDEN") => {
    try {
      await decide({ id, status }).unwrap();
      toast.success(status === "ACCEPTED" ? "Recommendation accepted." : "Recommendation overridden.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update recommendation.");
    }
  };

  const columns: ColumnDef<PlacementRecommendation, any>[] = [
    {
      id: "student",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Student
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold">
          {row.original.studentProfile?.fullName ?? "Lead applicant"}
        </span>
      ),
    },
    {
      id: "recommendedClass",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Recommended Level
        </span>
      ),
      cell: ({ row }) => <span className="text-xs">{row.original.recommendedClass?.name ?? "—"}</span>,
    },
    {
      id: "recommendedClassSection",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Recommended Class
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs">{row.original.recommendedClassSection?.name ?? "Unassigned"}</span>
      ),
    },
    {
      accessorKey: "rationale",
      header: ({ column }) => <SortableHeader column={column} label="Rationale" />,
      cell: ({ row }) => (
        <span
          className="block max-w-72 truncate text-xs text-muted-foreground"
          title={row.original.rationale}
        >
          {row.original.rationale}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]} className="text-[10px] uppercase">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "decision",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Decision
        </span>
      ),
      cell: ({ row }) => {
        const rec = row.original;
        return rec.status === "SUGGESTED" ? (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-lg text-[11px]"
              disabled={isDeciding}
              onClick={() => handleDecide(rec.id, "OVERRIDDEN")}
            >
              Override
            </Button>
            <Button
              size="sm"
              className="h-7 rounded-lg text-[11px]"
              disabled={isDeciding}
              onClick={() => handleDecide(rec.id, "ACCEPTED")}
            >
              Accept
            </Button>
          </div>
        ) : (
          <span className="block text-right text-[11px] text-muted-foreground">
            {rec.decidedAt ? new Date(rec.decidedAt).toLocaleDateString() : "—"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
          <Layers className="h-6 w-6 text-primary" />
          Placement Recommendations
        </h1>
        <p className="text-xs font-medium text-muted-foreground">
          Diagnostic-driven level and class section recommendations awaiting review.
        </p>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground">Recommendations</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-8 pl-8 text-xs"
                placeholder="Search rationale..."
              />
            </div>
            <Select value={values.status} onValueChange={(v) => setValue("status", v)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="SUGGESTED">Suggested</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="OVERRIDDEN">Overridden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={recommendations}
            isLoading={isLoading}
            page={values.page}
            pageSize={values.pageSize}
            total={total}
            onPageChange={(next) => setValue("page", next)}
            onPageSizeChange={(size) => setValue("pageSize", size)}
            paginationLabel="recommendation"
            sortBy={values.sortBy}
            sortOrder={values.sortOrder as "asc" | "desc"}
            onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
            emptyTitle="No placement recommendations for this filter"
          />
        </CardContent>
      </Card>
    </div>
  );
}
