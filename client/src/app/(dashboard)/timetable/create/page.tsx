"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTimetableMutation } from "@/features/academic/timetableApi";
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";

export default function CreateTimetablePage() {
  const router = useRouter();
  const { data: classSectionsData } = useGetClassSectionsQuery();
  const classSections = classSectionsData?.items || [];
  const [createTimetable, { isLoading }] = useCreateTimetableMutation();

  const [name, setName] = React.useState("");
  const [classSectionId, setClassSectionId] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState("");
  const [effectiveTo, setEffectiveTo] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !effectiveFrom || !classSectionId) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");

    const selectedClass = classSections.find((c) => c.id === classSectionId);
    if (!selectedClass) {
      setError("Invalid Class Section.");
      return;
    }

    try {
      await createTimetable({
        name,
        academicYearId: selectedClass.academicYearId,
        classSectionId,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
      }).unwrap();
      toast.success("Timetable created successfully.");
      router.push(`/timetable?classId=${classSectionId}`);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to create timetable.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/timetable"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Timetable
        </Link>
        <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
          <CalendarPlus className="h-6 w-6 text-primary" />
          Create Timetable
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Establish a timetable structure for a selected Grade or Class Section.
        </p>
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Timetable Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 10 Section A Timetable"
              className="h-10 border-border text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Class Section
            </Label>
            <select
              value={classSectionId}
              onChange={(e) => setClassSectionId(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
              required
            >
              <option value="">Select Class Section</option>
              {classSections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Effective From
              </Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-10 border-border text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Effective Until (Optional)
              </Label>
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="h-10 border-border text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/timetable")}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
