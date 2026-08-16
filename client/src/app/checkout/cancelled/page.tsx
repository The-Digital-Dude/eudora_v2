"use client";

import { ArrowLeft, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Stripe sends the buyer here if they back out of the payment sheet.
 *
 * The item they were buying is preserved in the query string so "try again"
 * returns them to a fully populated checkout rather than making them find the
 * programme a second time.
 */
export default function CheckoutCancelledPage() {
  const [retryHref, setRetryHref] = useState("/explore");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const slug = params.get("slug");
    if ((type === "program" || type === "course") && slug) {
      setRetryHref(`/checkout?type=${type}&slug=${slug}`);
    }
  }, []);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 text-center">
      <XCircle className="h-9 w-9 text-muted-foreground" />
      <h1 className="font-display text-xl font-bold text-foreground">
        Checkout cancelled
      </h1>
      <p className="max-w-sm text-xs text-muted-foreground">
        You have not been charged. Your selection is still here whenever you
        want to pick it back up.
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={retryHref}
          className="rounded-xl bg-foreground px-5 py-3 text-xs font-bold text-background hover:bg-foreground/90"
        >
          Try again
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to browsing
        </Link>
      </div>
    </div>
  );
}
