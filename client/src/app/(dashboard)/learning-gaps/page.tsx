"use client";

import { AlertTriangle, ListChecks, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { useAppSelector } from "@/store/hooks";

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

  const [statusFilter, setStatusFilter] = React.useState<GapStatus | "ALL">("OPEN");
  const { data: gaps, isLoading } = useListGapsQuery(
    statusFilter === "ALL" ? undefined : { status: statusFilter },
  );

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
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground">Gaps</CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GapStatus | "ALL")}>
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
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Loading learning gaps...
            </div>
          ) : !gaps || gaps.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              No learning gaps for this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Competency</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Root Cause</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.map((gap) => (
                  <TableRow key={gap.id}>
                    <TableCell className="text-xs font-semibold">
                      {gap.studentProfile?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{gap.competency?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_VARIANT[gap.severity]} className="text-[10px] uppercase">
                        {gap.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-xs text-muted-foreground" title={gap.rootCause}>
                      {gap.rootCause}
                    </TableCell>
                    <TableCell className="text-xs">
                      {gap.evidenceCount} · {gap.nextActions.length} action
                      {gap.nextActions.length === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={gap.status}
                        onValueChange={(v) => handleStatusChange(gap, v as GapStatus)}
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
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 rounded-lg text-[11px]"
                        onClick={() => openActionDialog(gap)}
                      >
                        <Plus className="h-3 w-3" />
                        Next Action
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
