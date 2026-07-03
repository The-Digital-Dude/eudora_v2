"use client";

import { Layers } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  type PlacementRecStatus,
  useDecidePlacementRecommendationMutation,
  useListPlacementRecommendationsQuery,
} from "@/features/academic/placementRecommendationsApi";

const STATUS_VARIANT: Record<PlacementRecStatus, "outline" | "secondary" | "default"> = {
  SUGGESTED: "outline",
  ACCEPTED: "default",
  OVERRIDDEN: "secondary",
};

export default function PlacementPage() {
  const [statusFilter, setStatusFilter] = React.useState<PlacementRecStatus | "ALL">("SUGGESTED");
  const { data: recommendations, isLoading } = useListPlacementRecommendationsQuery(
    statusFilter === "ALL" ? undefined : { status: statusFilter },
  );

  const [decide, { isLoading: isDeciding }] = useDecidePlacementRecommendationMutation();

  const handleDecide = async (id: string, status: "ACCEPTED" | "OVERRIDDEN") => {
    try {
      await decide({ id, status }).unwrap();
      toast.success(status === "ACCEPTED" ? "Recommendation accepted." : "Recommendation overridden.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update recommendation.");
    }
  };

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
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground">Recommendations</CardTitle>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as PlacementRecStatus | "ALL")}
          >
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
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Loading placement recommendations...
            </div>
          ) : !recommendations || recommendations.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              No placement recommendations for this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Recommended Level</TableHead>
                  <TableHead>Recommended Class</TableHead>
                  <TableHead>Rationale</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="text-xs font-semibold">
                      {rec.studentProfile?.fullName ?? "Lead applicant"}
                    </TableCell>
                    <TableCell className="text-xs">{rec.recommendedLevel?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {rec.recommendedClassSection?.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-xs text-muted-foreground" title={rec.rationale}>
                      {rec.rationale}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[rec.status]} className="text-[10px] uppercase">
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {rec.status === "SUGGESTED" ? (
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
                        <span className="text-[11px] text-muted-foreground">
                          {rec.decidedAt ? new Date(rec.decidedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
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
