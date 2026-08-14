"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { ListChecks, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/data-table";
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
  type NextAction,
  type NextActionStatus,
  useListNextActionsQuery,
  useUpdateNextActionMutation,
} from "@/features/academic/nextActionsApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<NextActionStatus, "outline" | "secondary" | "default" | "destructive"> = {
  PENDING: "outline",
  IN_PROGRESS: "secondary",
  DONE: "default",
  CANCELLED: "destructive",
};

const ACTION_TYPE_LABEL: Record<NextAction["actionType"], string> = {
  REVIEW: "Review",
  REASSESS: "Reassess",
  INTERVENTION: "Intervention",
  PRACTICE: "Practice",
};

export default function NextActionsPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  const { values, setValue, setValues } = useListQueryState(
    { search: "", scope: "MINE", status: "ALL", page: 1, sortBy: "", sortOrder: "asc" },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  const { data: actionsData, isLoading } = useListNextActionsQuery({
    ownerUserId: values.scope === "MINE" ? user?.id : undefined,
    status: values.status === "ALL" ? undefined : (values.status as NextActionStatus),
    search: values.search || undefined,
    page: values.page,
    limit: PAGE_SIZE,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });
  const actions = actionsData?.items ?? [];
  const total = actionsData?.total ?? 0;

  const [updateAction] = useUpdateNextActionMutation();

  const handleStatusChange = async (action: NextAction, status: NextActionStatus) => {
    try {
      await updateAction({ id: action.id, status }).unwrap();
      toast.success(`Marked as ${status.replace("_", " ").toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update next action.");
    }
  };

  const isOverdue = (action: NextAction) =>
    action.status !== "DONE" &&
    action.status !== "CANCELLED" &&
    new Date(action.dueDate) < new Date(new Date().toDateString());

  const columns: ColumnDef<NextAction, any>[] = [
    {
      id: "student",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Student
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold">{row.original.studentProfile?.fullName ?? "—"}</span>
      ),
    },
    {
      id: "competency",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Competency
        </span>
      ),
      cell: ({ row }) => <span className="text-xs">{row.original.competency?.name ?? "—"}</span>,
    },
    {
      accessorKey: "actionType",
      header: ({ column }) => <SortableHeader column={column} label="Type" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] uppercase">
          {ACTION_TYPE_LABEL[row.original.actionType]}
        </Badge>
      ),
    },
    {
      id: "reason",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Reason
        </span>
      ),
      cell: ({ row }) => (
        <span
          className="block max-w-64 truncate text-xs text-muted-foreground"
          title={row.original.reason}
        >
          {row.original.reason}
        </span>
      ),
    },
    {
      id: "owner",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Owner
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.owner
            ? `${row.original.owner.firstName} ${row.original.owner.lastName}`
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => <SortableHeader column={column} label="Due Date" />,
      cell: ({ row }) => (
        <span
          className={`text-xs ${isOverdue(row.original) ? "font-bold text-destructive" : ""}`}
        >
          {new Date(row.original.dueDate).toLocaleDateString()}
          {isOverdue(row.original) && " (overdue)"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(v) => handleStatusChange(row.original, v as NextActionStatus)}
        >
          <SelectTrigger className="h-7 w-32 text-[11px]">
            <SelectValue>
              <Badge variant={STATUS_VARIANT[row.original.status]} className="text-[10px]">
                {row.original.status.replace("_", " ")}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
          <ListChecks className="h-6 w-6 text-primary" />
          Next Actions
        </h1>
        <p className="text-xs font-medium text-muted-foreground">
          Follow-up interventions tracked against identified learning gaps.
        </p>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground">Actions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-44">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-8 pl-8 text-xs"
                placeholder="Search reason..."
              />
            </div>
            <Select value={values.scope} onValueChange={(v) => setValue("scope", v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MINE">Assigned to me</SelectItem>
                <SelectItem value="ALL">All owners</SelectItem>
              </SelectContent>
            </Select>
            <Select value={values.status} onValueChange={(v) => setValue("status", v)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={actions}
            isLoading={isLoading}
            page={values.page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(next) => setValue("page", next)}
            paginationLabel="action"
            sortBy={values.sortBy}
            sortOrder={values.sortOrder as "asc" | "desc"}
            onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
            emptyTitle="No next actions for this filter"
          />
        </CardContent>
      </Card>
    </div>
  );
}
