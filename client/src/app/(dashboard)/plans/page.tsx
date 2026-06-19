"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  AlertCircle,
  DollarSign,
  Users,
  School,
  GraduationCap
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetBillingPlansQuery,
  useCreateBillingPlanMutation
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
    <div className="space-y-6 animate-fade-in text-neutral-900 dark:text-zinc-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50 font-display">
            Billing Plans & Packages
          </h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">
            Configure academic subscription packages and limits for campuses.
          </p>
        </div>
        <div>
          <Button
            onClick={handleOpenPlanDialog}
            className="bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Plan
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {plansLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-72 border border-neutral-200 dark:border-zinc-800 rounded-3xl bg-neutral-100 dark:bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : plansData && plansData.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plansData.map((plan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 rounded-[32px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.015)] hover:shadow-lg transition-all flex flex-col justify-between border-t-4 border-t-neutral-900 dark:border-t-zinc-200 relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 font-mono">
                      {plan.code}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-zinc-50 font-display mt-1">{plan.name}</h3>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                    plan.active
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                      : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-500 border-neutral-200 dark:border-zinc-700"
                  }`}>
                    {plan.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-xs text-neutral-400 dark:text-zinc-400 leading-relaxed min-h-[40px]">
                    {plan.description}
                  </p>
                )}

                <div className="pt-2 border-t border-neutral-50 dark:border-zinc-800/50 space-y-1">
                  <div className="flex items-baseline text-neutral-900 dark:text-zinc-50">
                    <span className="text-2xl font-extrabold tracking-tight font-display">
                      ${Number(plan.priceMonthly).toFixed(2)}
                    </span>
                    <span className="ml-1 text-xs font-semibold text-neutral-400 dark:text-zinc-500">
                      /mo
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-neutral-400 dark:text-zinc-500">
                    ${Number(plan.priceAnnual).toFixed(2)}/yr (annual)
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-50 dark:border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-zinc-400">
                    <span>Currency</span>
                    <span className="font-bold uppercase text-neutral-700 dark:text-zinc-300">{plan.currency}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Max Students</span>
                    <span className="font-bold text-neutral-700 dark:text-zinc-300">
                      {plan.maxStudents !== null && plan.maxStudents !== undefined ? plan.maxStudents : "Unlimited"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><School className="w-3 h-3" /> Max Campuses</span>
                    <span className="font-bold text-neutral-700 dark:text-zinc-300">
                      {plan.maxCampuses !== null && plan.maxCampuses !== undefined ? plan.maxCampuses : "Unlimited"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Max Programs</span>
                    <span className="font-bold text-neutral-700 dark:text-zinc-300">
                      {plan.maxPrograms !== null && plan.maxPrograms !== undefined ? plan.maxPrograms : "Unlimited"}
                    </span>
                  </div>
                  {plan.stripePriceIdMonthly && (
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-zinc-400">
                      <span>Stripe Price (Mo)</span>
                      <span className="font-mono text-neutral-700 dark:text-zinc-300 font-semibold truncate max-w-[120px]" title={plan.stripePriceIdMonthly}>
                        {plan.stripePriceIdMonthly}
                      </span>
                    </div>
                  )}
                  {plan.stripePriceIdAnnual && (
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-zinc-400">
                      <span>Stripe Price (Yr)</span>
                      <span className="font-mono text-neutral-700 dark:text-zinc-300 font-semibold truncate max-w-[120px]" title={plan.stripePriceIdAnnual}>
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
        <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 space-y-2">
          <CreditCard className="w-8 h-8 text-neutral-300 dark:text-zinc-700 mx-auto" />
          <p className="text-xs text-neutral-500 dark:text-zinc-400 font-semibold">No subscription plans configured</p>
          <p className="text-[10px] text-neutral-400 dark:text-zinc-500">Create academic subscription plans to list them here.</p>
        </div>
      )}

      {/* Plan Form Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-neutral-900 dark:text-zinc-50">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-zinc-50 font-display">
              Create Subscription Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-zinc-400">
              Formulate plan tiers and optional Stripe references.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Plan Name</Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Premium Plan"
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Plan Code</Label>
                <Input
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  placeholder="e.g. PLATINUM"
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Description</Label>
              <textarea
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="List features, limits, and program access"
                className="w-full min-h-[60px] border border-neutral-200 dark:border-zinc-800 rounded-xl p-3 text-xs bg-white dark:bg-zinc-950 text-neutral-900 dark:text-zinc-50 focus:outline-none focus:border-neutral-900 dark:focus:border-zinc-300 focus:ring-1 focus:ring-neutral-900/10 placeholder:text-neutral-300 dark:placeholder:text-zinc-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Price/Mo ($)</Label>
                <Input
                  type="number"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Price/Yr ($)</Label>
                <Input
                  type="number"
                  value={priceAnnual}
                  onChange={(e) => setPriceAnnual(e.target.value)}
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Currency</Label>
                <Input
                  value={planCurrency}
                  onChange={(e) => setPlanCurrency(e.target.value)}
                  placeholder="USD"
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Max Students</Label>
                <Input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                  placeholder="Unlimited"
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Max Campuses</Label>
                <Input
                  type="number"
                  value={maxCampuses}
                  onChange={(e) => setMaxCampuses(e.target.value)}
                  placeholder="Unlimited"
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Max Programs</Label>
                <Input
                  type="number"
                  value={maxPrograms}
                  onChange={(e) => setMaxPrograms(e.target.value)}
                  placeholder="Unlimited"
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Stripe Price ID (Mo)</Label>
                <Input
                  value={stripePriceIdMonthly}
                  onChange={(e) => setStripePriceIdMonthly(e.target.value)}
                  placeholder="price_..."
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Stripe Price ID (Yr)</Label>
                <Input
                  value={stripePriceIdAnnual}
                  onChange={(e) => setStripePriceIdAnnual(e.target.value)}
                  placeholder="price_..."
                  className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPlanDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl border-neutral-200 dark:border-zinc-800 text-neutral-700 dark:text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingPlan}
                className="bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1 cursor-pointer"
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
