"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { toast } from "sonner";

import {
  formatCents,
  type OwnedEntitlement,
  useCreateBillingPortalMutation,
  useGetMyEntitlementsQuery,
  useGetOrdersQuery,
} from "@/features/billing/billingApi";

/**
 * What the guardian has bought, and where each payment plan stands.
 *
 * Deliberately separate from `BillingHistoryPanel`, which shows the
 * staff-entered offline invoice ledger (`FamilyInvoice`/`FamilyPayment`).
 * These are Stripe purchases; the two systems are unrelated and merging them
 * would misrepresent both.
 */
export function PurchasesPanel() {
  const { data: byChild, isLoading } = useGetMyEntitlementsQuery();
  const { data: orders } = useGetOrdersQuery();
  const [openPortal, { isLoading: openingPortal }] =
    useCreateBillingPortalMutation();

  const handlePortal = async () => {
    try {
      const { url } = await openPortal({ returnPath: "/parent" }).unwrap();
      window.location.href = url;
    } catch (err: any) {
      toast.error(
        err?.data?.message || "Billing portal is not available yet.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAnything = (byChild ?? []).some((c) => c.entitlements.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Your purchases</h3>
          <p className="text-[11px] text-muted-foreground">
            Programmes and courses you&apos;ve bought, by child.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePortal}
          disabled={openingPortal}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          {openingPortal ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CreditCard className="h-3.5 w-3.5" />
          )}
          Manage payment methods
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {!hasAnything ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border py-10 text-center">
          <BookOpen className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">
            No purchases yet
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background hover:bg-foreground/90"
          >
            Browse programmes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        (byChild ?? [])
          .filter((c) => c.entitlements.length > 0)
          .map((child) => (
            <section key={child.studentProfileId} className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {child.fullName}
              </h4>
              <div className="space-y-2">
                {child.entitlements.map((e) => (
                  <EntitlementRow key={e.id} entitlement={e} />
                ))}
              </div>
            </section>
          ))
      )}

      {!!orders?.length && (
        <section className="space-y-2 border-t border-border pt-5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Order history
          </h4>
          <ul className="space-y-1.5">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 px-3 py-2 text-xs"
              >
                <span className="text-foreground">
                  {order.items[0]?.program?.name ??
                    order.items[0]?.course?.title ??
                    "Purchase"}
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span>{format(new Date(order.createdAt), "d MMM yyyy")}</span>
                  <span className="font-semibold text-foreground">
                    {formatCents(order.totalCents, order.currency)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      order.status === "PAID"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {order.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EntitlementRow({ entitlement }: { entitlement: OwnedEntitlement }) {
  const title =
    entitlement.program?.name ?? entitlement.course?.title ?? "Purchase";
  const plan = entitlement.orderItem?.plan;

  // Access can lapse for two different reasons and they need different words:
  // a failed instalment is fixable by the guardian, an ended cohort is not.
  const isPastDue = entitlement.status === "PAST_DUE";
  const isExpired = entitlement.status === "EXPIRED";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">{title}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {entitlement.courseClass
              ? `Live batch · ${entitlement.courseClass.name}`
              : entitlement.accessExpiresAt
                ? `Access until ${format(new Date(entitlement.accessExpiresAt), "d MMM yyyy")}`
                : "Lifetime access"}
            {entitlement.source === "ADMIN_GRANT" ? " · granted" : ""}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
            entitlement.status === "ACTIVE"
              ? "bg-success/10 text-success"
              : isPastDue
                ? "bg-warning/10 text-warning"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {entitlement.status.replace("_", " ")}
        </span>
      </div>

      {plan && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Payment plan</span>
            <span className="font-semibold text-foreground">
              {plan.installmentsPaid} of {plan.installmentCount} paid
              {plan.status === "ACTIVE" && plan.paidThroughDate
                ? ` · next ${format(new Date(plan.paidThroughDate), "d MMM")}`
                : ""}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{
                width: `${Math.round((plan.installmentsPaid / plan.installmentCount) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {isPastDue && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-warning/20 bg-warning/10 p-2 text-[10px] font-semibold text-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          A payment didn&apos;t go through. Update your card to restore access.
        </p>
      )}
      {isExpired && entitlement.courseClass && (
        <p className="mt-3 text-[10px] text-muted-foreground">
          This live batch has finished.
        </p>
      )}
    </div>
  );
}
