"use client";

import { CreditCard, GraduationCap, Plus, School, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useGetBillingPlansQuery } from "@/features/dashboard/dashboardApi";

export default function BillingPage() {
  const { data: plansData, isLoading: plansLoading } = useGetBillingPlansQuery();

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
            asChild
            className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90 active:scale-98"
          >
            <Link href="/plans/create">
              <Plus className="h-4 w-4" /> Add Plan
            </Link>
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
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-t-4 border-border/80 border-t-neutral-900 bg-card p-6 shadow-[0_4px_16px_rgba(0,0,0,0.015)] transition-all hover:shadow-lg dark:border-t-zinc-200"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {plan.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold ${
                      plan.isActive
                        ? "border-success/20 bg-success/10 text-success"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {plan.isActive ? "ACTIVE" : "INACTIVE"}
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
            </Link>
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
    </div>
  );
}
