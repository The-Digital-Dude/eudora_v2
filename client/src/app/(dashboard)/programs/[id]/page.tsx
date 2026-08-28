"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteProgramMutation,
  useGetProgramQuery,
  useUpdateProgramMutation,
} from "@/features/dashboard/dashboardApi";

import { ProgramCoursesPanel } from "../components/program-courses-panel";
import {
  centsToDollars,
  EMPTY_PROGRAM,
  ProgramForm,
  type ProgramFormValues,
  toProgramPayload,
} from "../components/program-form";

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const programId = params?.id ?? "";

  const { data: program, isLoading } = useGetProgramQuery(programId, { skip: !programId });
  const [updateProgram, { isLoading: isSaving }] = useUpdateProgramMutation();
  const [deleteProgram] = useDeleteProgramMutation();

  const [values, setValues] = React.useState<ProgramFormValues>(EMPTY_PROGRAM);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!program) return;
    setValues({
      name: program.name ?? "",
      code: program.code ?? "",
      slug: program.slug ?? "",
      classId: program.classId ?? "",
      shortDescription: program.shortDescription ?? "",
      description: program.description ?? "",
      deliveryMode: program.deliveryMode ?? "SELF_PACED",
      durationMonths: program.durationMonths ? String(program.durationMonths) : "",
      priceOneTime: centsToDollars(program.priceOneTimeCents),
      priceMonthly: centsToDollars(program.priceMonthlyCents),
      installmentCount: program.installmentCount ? String(program.installmentCount) : "",
      status: program.status ?? "DRAFT",
    });
  }, [program]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await updateProgram({
        id: programId,
        body: toProgramPayload(values),
      }).unwrap();
      toast.success("Program updated");
      router.push("/programs");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save academic program.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this academic program?")) return;
    try {
      await deleteProgram(programId).unwrap();
      toast.success("Program deleted");
      router.push("/programs");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete program.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-3">
        <Link
          href="/programs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Programs
        </Link>
        <p className="text-sm font-semibold text-foreground">Program not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/programs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Programs
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {program.name}
          </h1>
        </div>

        <Button
          variant="outline"
          onClick={handleDelete}
          className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl border-destructive/20 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Program
        </Button>
      </div>

      <Card className="w-full rounded-3xl border border-border bg-card p-6">
        <ProgramForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/programs")}
          isSaving={isSaving}
          submitLabel="Save Changes"
          error={error}
        />
      </Card>

      <ProgramCoursesPanel program={program} />
    </div>
  );
}
