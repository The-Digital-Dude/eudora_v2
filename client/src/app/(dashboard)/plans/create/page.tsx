"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useCreateBillingPlanMutation } from "@/features/dashboard/dashboardApi";

import { EMPTY_PLAN, PlanForm, type PlanFormValues } from "../components/plan-form";

function toFeatures(csv: string): string[] {
  return csv
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

export default function CreatePlanPage() {
  const router = useRouter();
  const [createBillingPlan, { isLoading }] = useCreateBillingPlanMutation();
  const [values, setValues] = React.useState<PlanFormValues>(EMPTY_PLAN);
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await createBillingPlan({
        name: values.name,
        description: values.description || undefined,
        priceMonthly: parseFloat(values.priceMonthly),
        priceAnnual: parseFloat(values.priceAnnual),
        currency: values.currency,
        stripePriceIdMonthly: values.stripePriceIdMonthly || undefined,
        stripePriceIdAnnual: values.stripePriceIdAnnual || undefined,
        maxStudents: values.maxStudents ? parseInt(values.maxStudents, 10) : undefined,
        maxCampuses: values.maxCampuses ? parseInt(values.maxCampuses, 10) : undefined,
        maxPrograms: values.maxPrograms ? parseInt(values.maxPrograms, 10) : undefined,
        features: toFeatures(values.features),
        isPublic: values.isPublic,
      } as any).unwrap();
      toast.success("Plan created");
      router.push("/plans");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to create subscription plan.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Plans
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          New Subscription Plan
        </h1>
        <p className="text-xs text-muted-foreground">
          Formulate plan tiers and optional Stripe references.
        </p>
      </div>

      <Card className="max-w-2xl rounded-3xl border border-border bg-card p-6">
        <PlanForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/plans")}
          isSaving={isLoading}
          submitLabel="Create Plan"
          error={error}
        />
      </Card>
    </div>
  );
}
