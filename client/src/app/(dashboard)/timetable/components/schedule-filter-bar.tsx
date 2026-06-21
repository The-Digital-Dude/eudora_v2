"use client";

import * as React from "react";
import {
  useGetAcademicYearsQuery,
  useGetClassSectionsQuery,
  useGetTeacherProfilesQuery,
} from "@/features/dashboard/dashboardApi";
import { useGetTermsQuery } from "@/features/academic/timetableApi";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, GraduationCap, Users2, Landmark } from "lucide-react";

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
  const { data: yearsData, isLoading: yearsLoading } = useGetAcademicYearsQuery();
  const { data: classSectionsData, isLoading: classesLoading } = useGetClassSectionsQuery();
  const { data: teachersData, isLoading: teachersLoading } = useGetTeacherProfilesQuery();

  const { data: termsData, isLoading: termsLoading } = useGetTermsQuery(
    selectedYearId !== "all" ? { academicYearId: selectedYearId } : undefined,
    { skip: selectedYearId === "all" }
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
    <div className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-wrap gap-6 items-end">
      {/* Academic Year */}
      <div className="flex-1 min-w-[200px] space-y-2">
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <Landmark className="w-4 h-4" />
          <Label className="text-xs font-semibold uppercase tracking-wider">Academic Year</Label>
        </div>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="w-full h-11 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs font-medium bg-neutral-50/50 dark:bg-zinc-900/50">
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
      <div className="flex-1 min-w-[200px] space-y-2">
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <CalendarDays className="w-4 h-4" />
          <Label className="text-xs font-semibold uppercase tracking-wider">Term</Label>
        </div>
        <Select
          value={selectedTermId}
          onValueChange={setSelectedTermId}
          disabled={selectedYearId === "all" || termsLoading}
        >
          <SelectTrigger className="w-full h-11 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs font-medium bg-neutral-50/50 dark:bg-zinc-900/50">
            <SelectValue placeholder={selectedYearId === "all" ? "Select Academic Year first" : "Select Term"} />
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
      <div className="flex-1 min-w-[200px] space-y-2">
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <GraduationCap className="w-4 h-4" />
          <Label className="text-xs font-semibold uppercase tracking-wider">Class Section</Label>
        </div>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-full h-11 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs font-medium bg-neutral-50/50 dark:bg-zinc-900/50">
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
        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Users2 className="w-4 h-4" />
            <Label className="text-xs font-semibold uppercase tracking-wider">Teacher</Label>
          </div>
          <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger className="w-full h-11 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs font-medium bg-neutral-50/50 dark:bg-zinc-900/50">
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
