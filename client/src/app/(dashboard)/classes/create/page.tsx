"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useCreateClassSectionMutation } from "@/features/dashboard/dashboardApi";

import {
  ClassSectionForm,
  type ClassSectionFormValues,
  EMPTY_CLASS_SECTION,
} from "../components/class-section-form";

export default function CreateClassSectionPage() {
  const router = useRouter();
  const [createClassSection, { isLoading }] = useCreateClassSectionMutation();
  const [values, setValues] = React.useState<ClassSectionFormValues>(EMPTY_CLASS_SECTION);
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await createClassSection({
        ...values,
        // The form uses "" for the empty selections; the API expects them absent.
        class: values.class || undefined,
        classroom: values.classroom || undefined,
        learningSubjectId: values.learningSubjectId || undefined,
      }).unwrap();
      toast.success("Class section created");
      router.push("/classes");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to create class section.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/classes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Classes
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          New Class Section
        </h1>
        <p className="text-xs text-muted-foreground">
          Create a roster section under a program and academic year.
        </p>
      </div>

      <Card className="max-w-3xl rounded-3xl border border-border bg-card p-6">
        <ClassSectionForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/classes")}
          isSaving={isLoading}
          submitLabel="Create Section"
          error={error}
        />
      </Card>
    </div>
  );
}
