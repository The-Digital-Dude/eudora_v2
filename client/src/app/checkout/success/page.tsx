"use client";

import { ArrowRight, CheckCircle2, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  formatCents,
  type OrderView,
  useGetOrderQuery,
} from "@/features/billing/billingApi";

/**
 * Post-payment landing.
 *
 * Stripe redirects here the moment the card clears, but the entitlement is
 * granted by the webhook, which may not have arrived yet. So this polls the
 * order instead of assuming success — otherwise a buyer can land on "you're
 * enrolled", click through, and hit locked content.
 */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 20000;

export default function CheckoutSuccessPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get("orderId"));
  }, []);

  const { data: order } = useGetOrderQuery(orderId ?? "", {
    skip: !orderId,
    // Stop polling once the webhook has done its work, or once we give up.
    pollingInterval:
      timedOut || !orderId ? 0 : POLL_INTERVAL_MS,
  });

  const isPaid = order?.status === "PAID";

  useEffect(() => {
    if (isPaid || timedOut) return;
    const timer = setInterval(() => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) setTimedOut(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaid, timedOut]);

  if (!orderId) {
    return (
      <Shell>
        <p className="text-sm font-semibold text-foreground">
          We couldn&apos;t find that order.
        </p>
        <Link href="/parent" className="text-xs font-semibold text-primary hover:underline">
          Go to your dashboard
        </Link>
      </Shell>
    );
  }

  if (isPaid && order) {
    return <PaidState order={order} />;
  }

  // Payment succeeded at Stripe; only our side is still catching up. Say that
  // plainly rather than implying the payment itself is in doubt.
  return (
    <Shell>
      {timedOut ? (
        <>
          <Clock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">
            Your payment went through
          </p>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Setting up access is taking longer than usual. It will appear in
            your dashboard shortly. No need to pay again.
          </p>
          <Link
            href="/parent"
            className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background hover:bg-foreground/90"
          >
            Go to your dashboard
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">
            Payment received. Setting up access
          </p>
          <p className="text-xs text-muted-foreground">This takes a moment.</p>
        </>
      )}
    </Shell>
  );
}

function PaidState({ order }: { order: OrderView }) {
  const item = order.items[0];
  const plan = item?.plan;

  return (
    <Shell>
      <CheckCircle2 className="h-10 w-10 text-success" />
      <h1 className="font-display text-xl font-bold text-foreground">
        You&apos;re enrolled
      </h1>

      <div className="w-full max-w-sm space-y-1.5 rounded-2xl border border-border bg-card p-5 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">
            {item?.program ? "Programme" : "Course"}
          </span>
          <span className="font-semibold text-foreground">
            {item?.program?.name ?? item?.course?.title ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-semibold text-foreground">
            {formatCents(order.totalCents, order.currency)}
          </span>
        </div>
        {plan && (
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Instalments</span>
            <span className="font-semibold text-foreground">
              {plan.installmentsPaid} of {plan.installmentCount} paid
            </span>
          </div>
        )}
      </div>

      {/* Deep-link straight into the content rather than a receipt page — the
          point of buying is to start, and a dead end here wastes the moment. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/parent"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-3 text-xs font-bold text-background hover:bg-foreground/90"
        >
          Start learning
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/explore"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Browse more
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-3 px-4">
      {children}
    </div>
  );
}
