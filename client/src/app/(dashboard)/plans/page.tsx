"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  Activity,
  DollarSign
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [planAmount, setPlanAmount] = useState("199");
  const [planCurrency, setPlanCurrency] = useState("usd");
  const [planInterval, setPlanInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [stripePriceId, setStripePriceId] = useState("");
  const [stripeProductId, setStripeProductId] = useState("");

  const [formError, setFormError] = useState("");

  const handleOpenPlanDialog = () => {
    setFormError("");
    setPlanName("");
    setPlanCode("");
    setPlanDesc("");
    setPlanAmount("199");
    setPlanCurrency("usd");
    setPlanInterval("MONTHLY");
    setStripePriceId("");
    setStripeProductId("");
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !planCode || !planAmount) {
      setFormError("Plan Name, Code, and Amount are required.");
      return;
    }

    try {
      await createBillingPlan({
        name: planName,
        code: planCode.toUpperCase(),
        description: planDesc,
        amount: parseFloat(planAmount),
        currency: planCurrency,
        interval: planInterval,
        active: true,
        stripePriceId: stripePriceId || undefined,
        stripeProductId: stripeProductId || undefined,
      }).unwrap();
      setIsPlanDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to create subscription plan.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Billing Plans & Packages
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure mock/Stripe subscription packages for campuses.
          </p>
        </div>
        <div>
          <Button
            onClick={handleOpenPlanDialog}
            className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Plan
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {plansLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="h-64 border border-neutral-200 rounded-3xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : plansData && plansData.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plansData.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-neutral-200/80 rounded-[32px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-lg transition-all flex flex-col justify-between border-t-4 border-t-neutral-900 relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 font-mono">
                      {plan.code}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 font-display mt-1">{plan.name}</h3>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                    plan.active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-neutral-100 text-neutral-400 border-neutral-200"
                  }`}>
                    {plan.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-xs text-neutral-400 leading-relaxed min-h-[40px]">
                    {plan.description}
                  </p>
                )}

                <div className="pt-2">
                  <div className="flex items-baseline text-neutral-900">
                    <span className="text-3xl font-extrabold tracking-tight font-display">
                      ${plan.amount}
                    </span>
                    <span className="ml-1 text-xs font-semibold text-neutral-400">
                      /{plan.interval === "MONTHLY" ? "mo" : "yr"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-50 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Currency</span>
                    <span className="font-bold uppercase text-neutral-700">{plan.currency}</span>
                  </div>
                  {plan.stripePriceId && (
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>Stripe Price ID</span>
                      <span className="font-mono text-neutral-700 font-semibold truncate max-w-[120px]" title={plan.stripePriceId}>
                        {plan.stripePriceId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-neutral-200 rounded-3xl bg-white space-y-2">
          <CreditCard className="w-8 h-8 text-neutral-300 mx-auto" />
          <p className="text-xs text-neutral-500 font-semibold">No subscription plans configured</p>
          <p className="text-[10px] text-neutral-400">Create academic subscription plans to list them here.</p>
        </div>
      )}

      {/* Plan Form Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display">
              Create Subscription Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Formulate plan tiers and optional Stripe references.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Plan Name</Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Premium Plan"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Plan Code</Label>
                <Input
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  placeholder="e.g. PLATINUM"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description</Label>
              <textarea
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="List features, limits, and program access"
                className="w-full min-h-[70px] border border-neutral-200 rounded-xl p-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 placeholder:text-neutral-300"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Amount ($)</Label>
                <Input
                  type="number"
                  value={planAmount}
                  onChange={(e) => setPlanAmount(e.target.value)}
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Currency</Label>
                <Input
                  value={planCurrency}
                  onChange={(e) => setPlanCurrency(e.target.value)}
                  placeholder="usd"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Interval</Label>
                <select
                  value={planInterval}
                  onChange={(e: any) => setPlanInterval(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
                >
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="YEARLY">YEARLY</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stripe Product ID (Optional)</Label>
                <Input
                  value={stripeProductId}
                  onChange={(e) => setStripeProductId(e.target.value)}
                  placeholder="prod_..."
                  className="h-10 text-xs border-neutral-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stripe Price ID (Optional)</Label>
                <Input
                  value={stripePriceId}
                  onChange={(e) => setStripePriceId(e.target.value)}
                  placeholder="price_..."
                  className="h-10 text-xs border-neutral-200"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPlanDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingPlan}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1 cursor-pointer"
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
