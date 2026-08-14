"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ListChecks, Plus, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, SortableHeader } from "@/components/data-table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type GapStatus,
  type LearningGap,
  useListGapsQuery,
  useUpdateGapStatusMutation,
} from "@/features/academic/learningGapsApi";
import {
  type NextActionType,
  useCreateNextActionMutation,
} from "@/features/academic/nextActionsApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = 20;

const SEVERITY_VARIANT: Record<LearningGap["severity"], "outline" | "secondary" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "destructive",
};

const STATUS_LABEL: Record<GapStatus, string> = {
  OPEN: "Open",
  ADDRESSING: "Addressing",
  RESOLVED: "Resolved",
};

const ACTION_TYPES: NextActionType[] = ["REVIEW", "REASSESS", "INTERVENTION", "PRACTICE"];

export default function LearningGapsPage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  const { values, setValue, setValues } = useListQueryState(
    { search: "", status: "OPEN", page: 1, sortBy: "", sortOrder: "asc" },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  const { data: gapsData, isLoading } = useListGapsQuery({
    status: values.status === "ALL" ? undefined : (values.status as GapStatus),
    search: values.search || undefined,
    page: values.page,
    limit: PAGE_SIZE,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });
  const gaps = gapsData?.items ?? [];
  const total = gapsData?.total ?? 0;

  const [updateStatus] = useUpdateGapStatusMutation();
  const [createNextAction, { isLoading: isCreatingAction }] = useCreateNextActionMutation();

  const [actionDialogGap, setActionDialogGap] = React.useState<LearningGap | null>(null);
  const [actionType, setActionType] = React.useState<NextActionType>("REVIEW");
  const [reason, setReason] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [reassessmentPlan, setReassessmentPlan] = React.useState("");

  const handleStatusChange = async (gap: LearningGap, status: GapStatus) => {
    try {
      await updateStatus({ id: gap.id, status }).unwrap();
      toast.success(`Gap marked as ${STATUS_LABEL[status]}.`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update gap status.");
    }
  };

  const openActionDialog = (gap: LearningGap) => {
    setActionDialogGap(gap);
    setActionType("REVIEW");
    setReason("");
    setDueDate("");
    setReassessmentPlan("");
  };

  const handleCreateAction = async () => {
    if (!actionDialogGap || !user?.id || !dueDate || !reason.trim()) return;
    try {
      await createNextAction({
        gapId: actionDialogGap.id,
        studentProfileId: actionDialogGap.studentProfileId,
        competencyId: actionDialogGap.competencyId,
        actionType,
        reason: reason.trim(),
        ownerUserId: user.id,
        dueDate,
        reassessmentPlan: reassessmentPlan.trim() || undefined,
      }).unwrap();
      toast.success("Next action created.");
      setActionDialogGap(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create next action.");
    }
  };

  const columns: ColumnDef<LearningGap, any>[] = [
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
      accessorKey: "severity",
      header: ({ column }) => <SortableHeader column={column} label="Severity" />,
      cell: ({ row }) => (
        <Badge variant={SEVERITY_VARIANT[row.original.severity]} className="text-[10px] uppercase">
          {row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: "rootCause",
      header: ({ column }) => <SortableHeader column={column} label="Root Cause" />,
      cell: ({ row }) => (
        <span
          className="block max-w-64 truncate text-xs text-muted-foreground"
          title={row.original.rootCause}
        >
          {row.original.rootCause}
        </span>
      ),
    },
    {
      id: "evidence",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Evidence
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.evidenceCount} · {row.original.nextActions.length} action
          {row.original.nextActions.length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(v) => handleStatusChange(row.original, v as GapStatus)}
        >
          <SelectTrigger className="h-7 w-32 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ADDRESSING">Addressing</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Actions
        </span>
      ),
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 rounded-lg text-[11px]"
          onClick={() => openActionDialog(row.original)}
        >
          <Plus className="h-3 w-3" />
          Next Action
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
          <AlertTriangle className="h-6 w-6 text-primary" />
          Learning Gaps
        </h1>
        <p className="text-xs font-medium text-muted-foreground">
          Competency gaps identified from assessments, lessons, and observations.
        </p>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground">Gaps</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-8 pl-8 text-xs"
                placeholder="Search root cause..."
              />
            </div>
            <Select value={values.status} onValueChange={(v) => setValue("status", v)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ADDRESSING">Addressing</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={gaps}
            isLoading={isLoading}
            page={values.page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(next) => setValue("page", next)}
            paginationLabel="gap"
            sortBy={values.sortBy}
            sortOrder={values.sortOrder as "asc" | "desc"}
            onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
            emptyTitle="No learning gaps for this filter"
          />
        </CardContent>
      </Card>

      <Dialog open={!!actionDialogGap} onOpenChange={(open) => !open && setActionDialogGap(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ListChecks className="h-4 w-4 text-primary" />
              Create Next Action
            </DialogTitle>
            <DialogDescription className="text-xs">
              For {actionDialogGap?.studentProfile?.fullName} — {actionDialogGap?.competency?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Action Type</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as NextActionType)}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this action needed?"
                className="text-xs"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reassessment Plan (optional)</Label>
              <Textarea
                value={reassessmentPlan}
                onChange={(e) => setReassessmentPlan(e.target.value)}
                placeholder="How will mastery be reassessed?"
                className="text-xs"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActionDialogGap(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!reason.trim() || !dueDate || isCreatingAction}
              onClick={handleCreateAction}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
