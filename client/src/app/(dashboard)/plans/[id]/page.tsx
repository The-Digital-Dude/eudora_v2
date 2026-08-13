"use client";

import { ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteBillingPlanMutation,
  useGetBillingPlanQuery,
  useSyncBillingPlanToStripeMutation,
  useUpdateBillingPlanMutation,
} from "@/features/dashboard/dashboardApi";

import { EMPTY_PLAN, PlanForm, type PlanFormValues } from "../components/plan-form";

function toFeatures(csv: string): string[] {
  return csv
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

export default function PlanDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const planId = params?.id ?? "";

  const { data: plan, isLoading } = useGetBillingPlanQuery(planId, { skip: !planId });
  const [updateBillingPlan, { isLoading: isSaving }] = useUpdateBillingPlanMutation();
  const [deleteBillingPlan] = useDeleteBillingPlanMutation();
  const [syncToStripe, { isLoading: isSyncing }] = useSyncBillingPlanToStripeMutation();

  const [values, setValues] = React.useState<PlanFormValues>(EMPTY_PLAN);
  const [error, setError] = React.useState("");

  // Seed the form once the plan arrives. Nullable/numeric columns come back typed for
  // math, but the inputs are controlled and need strings.
  React.useEffect(() => {
    if (!plan) return;
    setValues({
      name: plan.name ?? "",
      description: plan.description ?? "",
      priceMonthly: String(plan.priceMonthly ?? ""),
      priceAnnual: String(plan.priceAnnual ?? ""),
      currency: plan.currency ?? "USD",
      stripePriceIdMonthly: plan.stripePriceIdMonthly ?? "",
      stripePriceIdAnnual: plan.stripePriceIdAnnual ?? "",
      maxStudents: plan.maxStudents !== null && plan.maxStudents !== undefined ? String(plan.maxStudents) : "",
      maxCampuses: plan.maxCampuses !== null && plan.maxCampuses !== undefined ? String(plan.maxCampuses) : "",
      maxPrograms: plan.maxPrograms !== null && plan.maxPrograms !== undefined ? String(plan.maxPrograms) : "",
      features: (plan.features ?? []).join(", "),
      isPublic: plan.isPublic ?? true,
    });
  }, [plan]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await updateBillingPlan({
        id: planId,
        body: {
          name: values.name,
          description: values.description || undefined,
          priceMonthly: parseFloat(values.priceMonthly),
          priceAnnual: parseFloat(values.priceAnnual),
          currency: values.currency,
          stripePriceIdMonthly: values.stripePriceIdMonthly || undefined,
          stripePriceIdAnnual: values.stripePriceIdAnnual || undefined,
          // Explicit null (not undefined) so clearing a limit actually unsets it rather than
          // being dropped from the PATCH body.
          maxStudents: values.maxStudents ? parseInt(values.maxStudents, 10) : null,
          maxCampuses: values.maxCampuses ? parseInt(values.maxCampuses, 10) : null,
          maxPrograms: values.maxPrograms ? parseInt(values.maxPrograms, 10) : null,
          features: toFeatures(values.features),
          isPublic: values.isPublic,
        } as any,
      }).unwrap();
      toast.success("Plan updated");
      router.push("/plans");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to update subscription plan.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Archive this plan? Existing subscriptions are unaffected, but it can no longer be selected for new ones.")) return;
    try {
      await deleteBillingPlan(planId).unwrap();
      toast.success("Plan archived");
      router.push("/plans");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to archive plan.");
    }
  };

  const handleSync = async () => {
    try {
      await syncToStripe(planId).unwrap();
      toast.success("Synced to Stripe");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to sync plan to Stripe.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-3">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Plans
        </Link>
        <p className="text-sm font-semibold text-foreground">Plan not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/plans"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Plans
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {plan.name}
          </h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl px-3 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sync to Stripe
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl border-destructive/20 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Archive Plan
          </Button>
        </div>
      </div>

      <Card className="max-w-2xl rounded-3xl border border-border bg-card p-6">
        <PlanForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/plans")}
          isSaving={isSaving}
          submitLabel="Save Changes"
          error={error}
        />
      </Card>
    </div>
  );
}
