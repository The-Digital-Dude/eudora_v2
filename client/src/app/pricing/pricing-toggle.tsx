"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { BillingPlan } from "@/features/dashboard/dashboardApi";

const ACRONYMS = new Set(["api", "sla", "sso"]);

function humanize(feature: string) {
  return feature
    .split(/[_-]/)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function limitLine(singular: string, plural: string, value?: number | null) {
  if (value === undefined) return null;
  if (value === null) return `Unlimited ${plural}`;
  return `Up to ${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

export function PricingToggle({ plans }: { plans: BillingPlan[] }) {
  const [interval, setInterval] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  return (
    <div>
      {/* Interval Toggle */}
      <div className="mx-auto mb-12 flex w-fit items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        {(["MONTHLY", "ANNUAL"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setInterval(option)}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              interval === option
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option === "MONTHLY" ? "Monthly" : "Annual"}
          </button>
        ))}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {plans.map((plan) => {
          const price = Number(interval === "MONTHLY" ? plan.priceMonthly : plan.priceAnnual);
          const isFree = price <= 0;
          const limits = [
            limitLine("student", "students", plan.maxStudents),
            limitLine("campus", "campuses", plan.maxCampuses),
            limitLine("programme", "programmes", plan.maxPrograms),
          ].filter((line): line is string => Boolean(line));

          return (
            <div
              key={plan.id}
              className="flex flex-col rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-shadow hover:shadow-md md:p-8"
            >
              <h3 className="font-display text-sm font-bold text-foreground">{plan.name}</h3>
              {plan.description && (
                <p className="mt-2 min-h-[32px] text-xs leading-normal text-muted-foreground">
                  {plan.description}
                </p>
              )}

              <div className="mt-6 flex items-baseline text-foreground">
                <span className="font-display text-3xl font-extrabold tracking-tight">
                  {isFree ? "Free" : `$${price.toFixed(0)}`}
                </span>
                {!isFree && (
                  <span className="ml-1 text-xs font-semibold text-muted-foreground">
                    /{interval === "MONTHLY" ? "mo" : "yr"} per campus
                  </span>
                )}
              </div>
              {!isFree && (
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                  Starts with a 14-day free trial
                </p>
              )}

              <ul className="mt-6 flex-1 space-y-2.5">
                {limits.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                    {line}
                  </li>
                ))}
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                    {humanize(feature)}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="mt-8">
                <button className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-foreground/90 active:scale-97">
                  {isFree ? "Start Free" : "Start Free Trial"}
                </button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
