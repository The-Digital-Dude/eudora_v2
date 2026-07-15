"use client";

import { CalendarDays, GraduationCap, Landmark,Users2 } from "lucide-react";
import * as React from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTermsQuery } from "@/features/academic/timetableApi";
import {
  useGetAcademicYearsQuery,
  useGetClassSectionsQuery,
  useGetTeacherProfilesQuery,
} from "@/features/dashboard/dashboardApi";

interface ScheduleFilterBarProps {
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  selectedTermId: string;
  setSelectedTermId: (id: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedTeacherId: string;
  setSelectedTeacherId: (id: string) => void;
  showTeacherFilter?: boolean;
}

export function ScheduleFilterBar({
  selectedYearId,
  setSelectedYearId,
  selectedTermId,
  setSelectedTermId,
  selectedClassId,
  setSelectedClassId,
  selectedTeacherId,
  setSelectedTeacherId,
  showTeacherFilter = true,
}: ScheduleFilterBarProps) {
  const { data: yearsData } = useGetAcademicYearsQuery();
  const { data: classSectionsData } = useGetClassSectionsQuery();
  const { data: teachersData } = useGetTeacherProfilesQuery();

  const { data: termsData, isLoading: termsLoading } = useGetTermsQuery(
    selectedYearId !== "all" ? { academicYearId: selectedYearId } : undefined,
    { skip: selectedYearId === "all" },
  );

  const years = yearsData?.items || [];
  const classSections = classSectionsData?.items || [];
  const teachers = teachersData?.items || [];
  const terms = termsData?.items || [];

  // Reset dependent filters if parent defaults to all
  React.useEffect(() => {
    if (selectedYearId === "all") {
      setSelectedTermId("all");
    }
  }, [selectedYearId, setSelectedTermId]);

  return (
    <div className="flex w-full flex-wrap items-end gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
      {/* Academic Year */}
      <div className="min-w-[200px] flex-1 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Landmark className="h-4 w-4" />
          <Label className="text-xs font-semibold tracking-wider uppercase">Academic Year</Label>
        </div>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted/30 text-xs font-medium">
            <SelectValue placeholder="Select Academic Year" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Academic Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Term */}
      <div className="min-w-[200px] flex-1 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <Label className="text-xs font-semibold tracking-wider uppercase">Term</Label>
        </div>
        <Select
          value={selectedTermId}
          onValueChange={setSelectedTermId}
          disabled={selectedYearId === "all" || termsLoading}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted/30 text-xs font-medium">
            <SelectValue
              placeholder={selectedYearId === "all" ? "Select Academic Year first" : "Select Term"}
            />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Terms</SelectItem>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class Section */}
      <div className="min-w-[200px] flex-1 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          <Label className="text-xs font-semibold tracking-wider uppercase">Class Section</Label>
        </div>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted/30 text-xs font-medium">
            <SelectValue placeholder="Select Class Section" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Class Sections</SelectItem>
            {classSections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Teacher Profile */}
      {showTeacherFilter && (
        <div className="min-w-[200px] flex-1 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users2 className="h-4 w-4" />
            <Label className="text-xs font-semibold tracking-wider uppercase">Teacher</Label>
          </div>
          <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted/30 text-xs font-medium">
              <SelectValue placeholder="Select Teacher" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

