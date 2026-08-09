import type { Metadata } from "next";

import Footer from "@/app/landing/components/footer";
import Navbar from "@/app/landing/components/navbar";
import { StructuredData } from "@/components/structured-data";
import { EmptyState } from "@/components/ui/empty-state";
import { SITE_NAME, SITE_URL } from "@/config/site";
import type { BillingPlan } from "@/features/dashboard/dashboardApi";

import { PricingToggle } from "./pricing-toggle";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, per-campus pricing for the Eudora education operating system. Every paid plan starts with a 14-day free trial.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing | ${SITE_NAME}`,
    description:
      "Simple, per-campus pricing for the Eudora education operating system. Every paid plan starts with a 14-day free trial.",
    url: "/pricing",
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

async function getPublicPlans(): Promise<BillingPlan[]> {
  try {
    const res = await fetch(`${API_BASE}/api/billing/plans/public`, {
      // Pricing doesn't change often — revalidate hourly rather than on every request.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    // Every API response is wrapped in the { success, data, meta } envelope
    // (see api-envelope.helpers.ts) — RTK Query's baseQuery unwraps this for
    // client-side calls, but this is a plain server-side fetch, so unwrap it here.
    const body = await res.json();
    const data = body?.data ?? body;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const plans = await getPublicPlans();

  const productJsonLd =
    plans.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: SITE_NAME,
          description: "AI-powered education operating system for schools.",
          brand: { "@type": "Brand", name: SITE_NAME },
          offers: plans.map((plan) => ({
            "@type": "Offer",
            name: plan.name,
            description: plan.description || undefined,
            price: Number(plan.priceMonthly).toFixed(2),
            priceCurrency: plan.currency || "USD",
            url: `${SITE_URL}/pricing`,
            availability: "https://schema.org/InStock",
          })),
        }
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {productJsonLd && <StructuredData data={productJsonLd} />}
      <Navbar />

      <main className="flex-1">
        <section className="border-t border-border/40 bg-background py-20 select-none">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
              <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm">
                Pricing
              </span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
                Simple, per-campus pricing.
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                One subscription per campus. Every paid plan starts with a 14-day free trial, and
                you can upgrade, downgrade, or cancel anytime from your billing portal.
              </p>
            </div>

            {plans.length > 0 ? (
              <PricingToggle plans={plans} />
            ) : (
              <EmptyState
                title="Pricing is being finalized"
                description="Reach out and we'll walk you through current plans and what fits your campus."
                className="mx-auto max-w-lg"
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
