import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { formatPrice, getPublicPrograms } from "@/lib/public-catalog";

import { LandingLottie } from "./landing-lottie";

/**
 * Real programmes with real prices, read from the public catalog at build time.
 *
 * This file previously existed but was empty and unimported, so the marketing
 * site could not answer "what does this cost" at all — the single biggest hole
 * in the funnel for a business whose buyers are individual guardians.
 *
 * A server component: it must render into the static HTML to be indexable, so
 * it cannot use the cookie-bound RTK Query client.
 */
export default async function PricingSection() {
  const programs = await getPublicPrograms();
  const sellable = (programs ?? [])
    .filter((p) => p.priceOneTimeCents)
    .sort((a, b) => (a.priceOneTimeCents ?? 0) - (b.priceOneTimeCents ?? 0))
    .slice(0, 3);

  // Nothing published yet — render nothing rather than an empty-state that
  // would read as a broken page to a first-time visitor.
  if (sellable.length === 0) return null;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        {/* Weighing up the options — the state a visitor is actually in when
            they reach this section. */}
        <LandingLottie
          src="/lottie/boy-thinking.lottie"
          className="mx-auto mb-2 h-28 w-28 md:h-32 md:w-32"
        />
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Simple, one-time pricing
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Pay once for the whole programme, or spread it over monthly
          instalments. No subscription, no surprise renewals.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {sellable.map((program, index) => {
          // Middle card is the anchor — standard three-tier framing, and it is
          // where we want attention when there are three real options.
          const featured = sellable.length === 3 && index === 1;

          return (
            <article
              key={program.id}
              className={`flex flex-col rounded-3xl border bg-card p-6 ${
                featured
                  ? "border-foreground shadow-lg"
                  : "border-border shadow-sm"
              }`}
            >
              {featured && (
                <span className="mb-3 w-fit rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">
                  MOST POPULAR
                </span>
              )}

              <h3 className="font-display text-base font-bold text-foreground">
                {program.name}
              </h3>
              {program.class && (
                <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                  {program.class.name}
                </p>
              )}

              <div className="mt-4">
                <p className="font-display text-3xl font-bold text-foreground">
                  {formatPrice(program.priceOneTimeCents, program.currency)}
                </p>
                {program.priceMonthlyCents && program.installmentCount ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    or {program.installmentCount} ×{" "}
                    {formatPrice(program.priceMonthlyCents, program.currency)}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    one-time payment
                  </p>
                )}
              </div>

              {program.shortDescription && (
                <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {program.shortDescription}
                </p>
              )}

              <ul className="mt-4 flex-1 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {program._count.programCourses} full courses
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {program.deliveryMode === "LIVE"
                    ? "Live classes with a teacher"
                    : "Learn at your own pace"}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  Guardian progress tracking
                </li>
              </ul>

              <Link
                href={`/explore/programs/${program.slug}`}
                className={`mt-6 flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold ${
                  featured
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                See what&apos;s included
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Looking for something smaller?{" "}
        <Link href="/explore" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Browse individual courses
        </Link>
      </p>
    </section>
  );
}
