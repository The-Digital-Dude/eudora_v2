"use client";

import { AlertCircle, Trash } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TeacherProfile } from "@/features/dashboard/dashboardApi";
import {
  useAssignTeacherClassMutation,
  useGetClassSectionsQuery,
  useRemoveTeacherClassMutation,
} from "@/features/dashboard/dashboardApi";

const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none";
const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

/** Homeroom section allocations for one teacher — lives on /teachers/[id] since it requires an existing teacherProfileId. */
export function TeacherClassAssignments({ teacher }: { teacher: TeacherProfile }) {
  const { data: sectionsData } = useGetClassSectionsQuery();
  const [assignTeacherClass, { isLoading: assigning }] = useAssignTeacherClassMutation();
  const [removeTeacherClass] = useRemoveTeacherClassMutation();

  const [sectionId, setSectionId] = React.useState("");
  const [role, setRole] = React.useState("PRIMARY");
  const [error, setError] = React.useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId) {
      setError("Class Section is required.");
      return;
    }
    setError("");
    try {
      await assignTeacherClass({ id: teacher.id, classSectionId: sectionId, role }).unwrap();
      setSectionId("");
      setRole("PRIMARY");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to assign teacher to class.");
    }
  };

  const handleRemove = async (classSectionId: string) => {
    if (!confirm("Remove teacher from this class section assignment?")) return;
    try {
      await removeTeacherClass({ id: teacher.id, classSectionId }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to remove class assignment.");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="grid grid-cols-3 items-end gap-3 rounded-2xl border border-border bg-muted/50 p-4"
      >
        <div className="col-span-1 space-y-1">
          <Label className={labelClass}>Class Section</Label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
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
          <Label className={labelClass}>Teacher Role</Label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass} required>
            <option value="PRIMARY">PRIMARY</option>
            <option value="ASSISTANT">ASSISTANT</option>
            <option value="SUBSTITUTE">SUBSTITUTE</option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={assigning}
          className="h-10 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
        >
          {assigning ? "Assigning..." : "Assign Section"}
        </Button>
      </form>

      <div className="space-y-2">
        <h3 className={labelClass}>Currently Assigned Sections</h3>
        <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
          {teacher.classAssignments && teacher.classAssignments.length > 0 ? (
            teacher.classAssignments.map((a) => (
              <div
                key={a.classSectionId}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {a.classSection?.name || "Homeroom Class"}
                  </p>
                  <p className="text-[9px] font-semibold text-success">Role: {a.role}</p>
                </div>
                <Button
                  onClick={() => handleRemove(a.classSectionId)}
                  variant="outline"
                  className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          ) : (
            <p className="py-3 text-center text-xs font-medium text-muted-foreground">
              No active class section allocations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
