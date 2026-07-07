"use client";

import { ListChecks } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type NextAction,
  type NextActionStatus,
  useListNextActionsQuery,
  useUpdateNextActionMutation,
} from "@/features/academic/nextActionsApi";
import { useAppSelector } from "@/store/hooks";

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

  const [scope, setScope] = React.useState<"MINE" | "ALL">("MINE");
  const [statusFilter, setStatusFilter] = React.useState<NextActionStatus | "ALL">("ALL");

  const { data: actions, isLoading } = useListNextActionsQuery({
    ownerUserId: scope === "MINE" ? user?.id : undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

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
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground">Actions</CardTitle>
          <div className="flex gap-2">
            <Select value={scope} onValueChange={(v) => setScope(v as "MINE" | "ALL")}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MINE">Assigned to me</SelectItem>
                <SelectItem value="ALL">All owners</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as NextActionStatus | "ALL")}
            >
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
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Loading next actions...
            </div>
          ) : !actions || actions.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              No next actions for this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Competency</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell className="text-xs font-semibold">
                      {action.studentProfile?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{action.competency?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {ACTION_TYPE_LABEL[action.actionType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-xs text-muted-foreground" title={action.reason}>
                      {action.reason}
                    </TableCell>
                    <TableCell className="text-xs">
                      {action.owner ? `${action.owner.firstName} ${action.owner.lastName}` : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-xs ${isOverdue(action) ? "font-bold text-destructive" : ""}`}
                    >
                      {new Date(action.dueDate).toLocaleDateString()}
                      {isOverdue(action) && " (overdue)"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={action.status}
                        onValueChange={(v) => handleStatusChange(action, v as NextActionStatus)}
                      >
                        <SelectTrigger className="h-7 w-32 text-[11px]">
                          <SelectValue>
                            <Badge variant={STATUS_VARIANT[action.status]} className="text-[10px]">
                              {action.status.replace("_", " ")}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
