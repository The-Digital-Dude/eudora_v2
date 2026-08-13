"use client";

import { AlertCircle, Trash } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudentProfile } from "@/features/dashboard/dashboardApi";
import {
  useCreateStudentEnrollmentMutation,
  useCreateStudentPlacementMutation,
  useDeleteStudentEnrollmentMutation,
  useDeleteStudentPlacementMutation,
  useGetAcademicYearsQuery,
  useGetClassSectionsQuery,
  useGetCourseClassesQuery,
} from "@/features/dashboard/dashboardApi";

const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none";
const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

/**
 * Placements (homeroom class sections) and enrollments (course classes) for one student.
 * Lives on /students/[id] rather than a separate dialog — both require an existing
 * studentProfileId, so there's nothing to manage until the profile itself is saved.
 */
export function StudentAcademicRoutes({ student }: { student: StudentProfile }) {
  const { data: sectionsData } = useGetClassSectionsQuery();
  const { data: yearsData } = useGetAcademicYearsQuery();
  const { data: courseClassesData } = useGetCourseClassesQuery();

  const [createPlacement, { isLoading: placing }] = useCreateStudentPlacementMutation();
  const [deletePlacement] = useDeleteStudentPlacementMutation();
  const [createEnrollment, { isLoading: enrolling }] = useCreateStudentEnrollmentMutation();
  const [deleteEnrollment] = useDeleteStudentEnrollmentMutation();

  const [placementSectionId, setPlacementSectionId] = React.useState("");
  const [placementYearId, setPlacementYearId] = React.useState("");
  const [enrollmentClassId, setEnrollmentClassId] = React.useState("");
  const [error, setError] = React.useState("");

  const handleAddPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placementSectionId || !placementYearId) {
      setError("Placement Section and Academic Year are required.");
      return;
    }
    setError("");
    try {
      await createPlacement({
        studentProfileId: student.id,
        classSectionId: placementSectionId,
        academicYearId: placementYearId,
      }).unwrap();
      setPlacementSectionId("");
      setPlacementYearId("");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to record class placement.");
    }
  };

  const handleRemovePlacement = async (classSectionId: string) => {
    if (!confirm("Remove student from this class section placement?")) return;
    try {
      await deletePlacement({ studentProfileId: student.id, classSectionId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to remove class placement.");
    }
  };

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentClassId) {
      setError("Course Class is required.");
      return;
    }
    setError("");
    try {
      await createEnrollment({
        studentProfileId: student.id,
        courseClassId: enrollmentClassId,
      }).unwrap();
      setEnrollmentClassId("");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to record course enrollment.");
    }
  };

  const handleRemoveEnrollment = async (id: string) => {
    if (!confirm("Remove student from this course class enrollment?")) return;
    try {
      await deleteEnrollment(id).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to revoke course enrollment.");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Tabs defaultValue="placements" className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted p-1">
          <TabsTrigger
            value="placements"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-card"
          >
            Class Section Placements
          </TabsTrigger>
          <TabsTrigger
            value="enrollments"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-card"
          >
            Course Class Enrollments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="placements" className="space-y-6 pt-4">
          <form
            onSubmit={handleAddPlacement}
            className="grid grid-cols-3 items-end gap-3 rounded-2xl border border-border bg-muted/30 p-4"
          >
            <div className="col-span-1 space-y-1">
              <Label className={labelClass}>Class Section</Label>
              <select
                value={placementSectionId}
                onChange={(e) => setPlacementSectionId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="" disabled>
                  Select Section
                </option>
                {(sectionsData?.items ?? [])
                  .filter((s: any) => s.status === "ACTIVE")
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
              </select>
            </div>

            <div className="col-span-1 space-y-1">
              <Label className={labelClass}>Academic Year</Label>
              <select
                value={placementYearId}
                onChange={(e) => setPlacementYearId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="" disabled>
                  Select Year
                </option>
                {(yearsData?.items ?? [])
                  .filter((y: any) => y.status === "ACTIVE")
                  .map((y: any) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={placing}
              className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
            >
              {placing ? "Adding..." : "Place Student"}
            </Button>
          </form>

          <div className="space-y-2">
            <h3 className={labelClass}>Active Placements</h3>
            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {student.placements && student.placements.length > 0 ? (
                student.placements.map((p) => (
                  <div
                    key={p.classSectionId}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {p.classSection?.name || "Homeroom Class"}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground">
                        Section Code: {p.classSection?.code || "N/A"}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemovePlacement(p.classSectionId)}
                      variant="outline"
                      className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-xs font-medium text-muted-foreground">
                  No active class section placements.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6 pt-4">
          <form
            onSubmit={handleAddEnrollment}
            className="flex items-end gap-3 rounded-2xl border border-border bg-muted/30 p-4"
          >
            <div className="flex-1 space-y-1">
              <Label className={labelClass}>Course Class</Label>
              <select
                value={enrollmentClassId}
                onChange={(e) => setEnrollmentClassId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="" disabled>
                  Select Course Class
                </option>
                {(courseClassesData?.items ?? [])
                  .filter((c: any) => c.status === "ACTIVE")
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={enrolling}
              className="h-10 shrink-0 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
            >
              {enrolling ? "Enrolling..." : "Enroll Student"}
            </Button>
          </form>

          <div className="space-y-2">
            <h3 className={labelClass}>Active Course Enrollments</h3>
            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {student.enrollments && student.enrollments.length > 0 ? (
                student.enrollments.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {e.courseClass?.name || "Course Lecture"}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground">
                        Class Code: {e.courseClass?.code || "N/A"}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveEnrollment(e.id)}
                      variant="outline"
                      className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-xs font-medium text-muted-foreground">
                  No active course class enrollments.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
