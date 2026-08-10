"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteClassSectionMutation,
  useGetClassSectionQuery,
  useUpdateClassSectionMutation,
} from "@/features/dashboard/dashboardApi";

import {
  ClassSectionForm,
  type ClassSectionFormValues,
  EMPTY_CLASS_SECTION,
} from "../components/class-section-form";

export default function ClassSectionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sectionId = params?.id ?? "";

  const { data: section, isLoading } = useGetClassSectionQuery(sectionId, {
    skip: !sectionId,
  });
  const [updateClassSection, { isLoading: isSaving }] = useUpdateClassSectionMutation();
  const [deleteClassSection] = useDeleteClassSectionMutation();

  const [values, setValues] = React.useState<ClassSectionFormValues>(EMPTY_CLASS_SECTION);
  const [error, setError] = React.useState("");

  // Seed the form once the section arrives. Nullable columns come back as null, but the inputs are
  // controlled and need strings.
  React.useEffect(() => {
    if (!section) return;
    setValues({
      name: section.name ?? "",
      code: section.code ?? "",
      programId: section.programId ?? "",
      academicYearId: section.academicYearId ?? "",
      class: section.class ?? "",
      classroom: section.classroom ?? "",
      learningSubjectId: section.learningSubjectId ?? "",
      status: section.status ?? "ACTIVE",
    });
  }, [section]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await updateClassSection({
        id: sectionId,
        body: {
          ...values,
          class: values.class || undefined,
          classroom: values.classroom || undefined,
          // Explicitly null (not undefined) so clearing the subject actually unsets it rather than
          // being dropped from the PATCH body.
          learningSubjectId: values.learningSubjectId || null,
        },
      }).unwrap();
      toast.success("Class section updated");
      router.push("/classes");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to update class section.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this class section? Attendance and timetable data reference it.")) return;
    try {
      await deleteClassSection(sectionId).unwrap();
      toast.success("Class section deleted");
      router.push("/classes");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete class section.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="space-y-3">
        <Link
          href="/classes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Classes
        </Link>
        <p className="text-sm font-semibold text-foreground">Class section not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/classes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Classes
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {section.name}
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground uppercase">{section.code}</p>
        </div>

        <Button
          variant="outline"
          onClick={handleDelete}
          className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl border-destructive/20 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Section
        </Button>
      </div>

      <Card className="max-w-3xl rounded-3xl border border-border bg-card p-6">
        <ClassSectionForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/classes")}
          isSaving={isSaving}
          submitLabel="Save Changes"
          error={error}
        />
      </Card>
    </div>
  );
}
