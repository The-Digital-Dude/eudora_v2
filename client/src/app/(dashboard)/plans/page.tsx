"use client";

import {
  AlertCircle,
  CreditCard,
  GraduationCap,
  Plus,
  School,
  Users,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateBillingPlanMutation,
  useGetBillingPlansQuery,
} from "@/features/dashboard/dashboardApi";

export default function BillingPage() {
  const { data: plansData, isLoading: plansLoading } = useGetBillingPlansQuery();
  const [createBillingPlan, { isLoading: creatingPlan }] = useCreateBillingPlanMutation();

  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("29");
  const [priceAnnual, setPriceAnnual] = useState("290");
  const [planCurrency, setPlanCurrency] = useState("USD");
  const [stripePriceIdMonthly, setStripePriceIdMonthly] = useState("");
  const [stripePriceIdAnnual, setStripePriceIdAnnual] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [maxCampuses, setMaxCampuses] = useState("");
  const [maxPrograms, setMaxPrograms] = useState("");

  const [formError, setFormError] = useState("");

  const handleOpenPlanDialog = () => {
    setFormError("");
    setPlanName("");
    setPlanCode("");
    setPlanDesc("");
    setPriceMonthly("29");
    setPriceAnnual("290");
    setPlanCurrency("USD");
    setStripePriceIdMonthly("");
    setStripePriceIdAnnual("");
    setMaxStudents("");
    setMaxCampuses("");
    setMaxPrograms("");
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !planCode || !priceMonthly || !priceAnnual) {
      setFormError("Plan Name, Code, and both Monthly & Annual Prices are required.");
      return;
    }

    try {
      await createBillingPlan({
        name: planName,
        code: planCode.toUpperCase(),
        description: planDesc,
        priceMonthly: parseFloat(priceMonthly),
        priceAnnual: parseFloat(priceAnnual),
        currency: planCurrency.toUpperCase(),
        active: true,
        stripePriceIdMonthly: stripePriceIdMonthly || undefined,
        stripePriceIdAnnual: stripePriceIdAnnual || undefined,
        maxStudents: maxStudents ? parseInt(maxStudents, 10) : null,
        maxCampuses: maxCampuses ? parseInt(maxCampuses, 10) : null,
        maxPrograms: maxPrograms ? parseInt(maxPrograms, 10) : null,
      } as any).unwrap();
      setIsPlanDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to create subscription plan.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Billing Plans & Packages
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure academic subscription packages and limits for campuses.
          </p>
        </div>
        <div>
          <Button
            onClick={handleOpenPlanDialog}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90 active:scale-98"
          >
            <Plus className="h-4 w-4" /> Add Plan
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {plansLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              className="h-72 animate-pulse rounded-3xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : plansData && plansData.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plansData.map((plan) => (
            <div
              key={plan.id}
              className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-t-4 border-border/80 border-t-neutral-900 bg-card p-6 shadow-[0_4px_16px_rgba(0,0,0,0.015)] transition-all hover:shadow-lg dark:border-t-zinc-200"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                      {plan.code}
                    </span>
                    <h3 className="font-display mt-1 text-base font-bold text-foreground">
                      {plan.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold ${
                      plan.active
                        ? "border-success/20 bg-success/10 text-success"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {plan.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                {plan.description && (
                  <p className="min-h-[40px] text-xs leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                )}

                <div className="space-y-1 border-t border-border/30 pt-2/50">
                  <div className="flex items-baseline text-foreground">
                    <span className="font-display text-2xl font-extrabold tracking-tight">
                      ${Number(plan.priceMonthly).toFixed(2)}
                    </span>
                    <span className="ml-1 text-xs font-semibold text-muted-foreground">
                      /mo
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    ${Number(plan.priceAnnual).toFixed(2)}/yr (annual)
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/30 pt-4/80">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Currency</span>
                    <span className="font-bold text-foreground uppercase">
                      {plan.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> Max Students
                    </span>
                    <span className="font-bold text-foreground">
                      {plan.maxStudents !== null && plan.maxStudents !== undefined
                        ? plan.maxStudents
                        : "Unlimited"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <School className="h-3 w-3" /> Max Campuses
                    </span>
                    <span className="font-bold text-foreground">
                      {plan.maxCampuses !== null && plan.maxCampuses !== undefined
                        ? plan.maxCampuses
                        : "Unlimited"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> Max Programs
                    </span>
                    <span className="font-bold text-foreground">
                      {plan.maxPrograms !== null && plan.maxPrograms !== undefined
                        ? plan.maxPrograms
                        : "Unlimited"}
                    </span>
                  </div>
                  {plan.stripePriceIdMonthly && (
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Stripe Price (Mo)</span>
                      <span
                        className="max-w-[120px] truncate font-mono font-semibold text-foreground"
                        title={plan.stripePriceIdMonthly}
                      >
                        {plan.stripePriceIdMonthly}
                      </span>
                    </div>
                  )}
                  {plan.stripePriceIdAnnual && (
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Stripe Price (Yr)</span>
                      <span
                        className="max-w-[120px] truncate font-mono font-semibold text-foreground"
                        title={plan.stripePriceIdAnnual}
                      >
                        {plan.stripePriceIdAnnual}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 rounded-3xl border border-dashed border-border bg-card py-12 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground">
            No subscription plans configured
          </p>
          <p className="text-[10px] text-muted-foreground">
            Create academic subscription plans to list them here.
          </p>
        </div>
      )}

      {/* Plan Form Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Create Subscription Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Formulate plan tiers and optional Stripe references.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Plan Name
                </Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Premium Plan"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Plan Code
                </Label>
                <Input
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  placeholder="e.g. PLATINUM"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                Description
              </Label>
              <textarea
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="List features, limits, and program access"
                className="min-h-[60px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none dark:placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Price/Mo ($)
                </Label>
                <Input
                  type="number"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Price/Yr ($)
                </Label>
                <Input
                  type="number"
                  value={priceAnnual}
                  onChange={(e) => setPriceAnnual(e.target.value)}
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Currency
                </Label>
                <Input
                  value={planCurrency}
                  onChange={(e) => setPlanCurrency(e.target.value)}
                  placeholder="USD"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Max Students
                </Label>
                <Input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                  placeholder="Unlimited"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Max Campuses
                </Label>
                <Input
                  type="number"
                  value={maxCampuses}
                  onChange={(e) => setMaxCampuses(e.target.value)}
                  placeholder="Unlimited"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Max Programs
                </Label>
                <Input
                  type="number"
                  value={maxPrograms}
                  onChange={(e) => setMaxPrograms(e.target.value)}
                  placeholder="Unlimited"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Stripe Price ID (Mo)
                </Label>
                <Input
                  value={stripePriceIdMonthly}
                  onChange={(e) => setStripePriceIdMonthly(e.target.value)}
                  placeholder="price_..."
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Stripe Price ID (Yr)
                </Label>
                <Input
                  value={stripePriceIdAnnual}
                  onChange={(e) => setStripePriceIdAnnual(e.target.value)}
                  placeholder="price_..."
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPlanDialogOpen(false)}
                className="h-10 rounded-xl border-border text-xs font-semibold text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingPlan}
                className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
              >
                {creatingPlan ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
