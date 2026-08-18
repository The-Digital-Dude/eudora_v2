"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useCreateProgramMutation } from "@/features/dashboard/dashboardApi";

import {
  EMPTY_PROGRAM,
  ProgramForm,
  type ProgramFormValues,
  toProgramPayload,
} from "../components/program-form";

export default function CreateProgramPage() {
  const router = useRouter();
  const [createProgram, { isLoading }] = useCreateProgramMutation();
  const [values, setValues] = React.useState<ProgramFormValues>(EMPTY_PROGRAM);
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await createProgram(toProgramPayload(values)).unwrap();
      toast.success("Program created");
      router.push("/programs");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save academic program.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/programs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Programs
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Add Academic Program
        </h1>
        <p className="text-xs text-muted-foreground">
          Create and associate a curriculum/degree course.
        </p>
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        <ProgramForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/programs")}
          isSaving={isLoading}
          submitLabel="Save Program"
          error={error}
        />
      </Card>
    </div>
  );
}
