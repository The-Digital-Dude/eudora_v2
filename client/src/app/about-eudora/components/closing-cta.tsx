import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { LandingLottie } from "@/app/landing/components/landing-lottie";
import { CloudShape } from "@/components/decorative/cloud-shape";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-background px-6 py-20 md:py-28">
      <div className="pointer-events-none absolute top-0 left-1/2 h-72 w-full max-w-3xl -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-amber-300/[0.14] to-transparent blur-3xl" />
      <CloudShape className="top-10 left-[8%] h-9 w-24 text-[#241546]/[0.06]" />
      <CloudShape className="top-16 right-[10%] h-8 w-20 text-amber-400/[0.14]" />

      <div className="relative mx-auto max-w-2xl text-center">
        <LandingLottie
          src="/lottie/mascot-clio-cheering-with-winner-cup-standing.lottie"
          className="mx-auto h-36 w-36 md:h-44 md:w-44"
        />

        <h2 className="font-display mt-4 text-2xl font-extrabold tracking-tight text-balance text-foreground sm:text-3xl md:text-4xl">
          Ready to pick a course?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
          Browse the catalogue and see what your child would actually be doing. Every course lists
          its grade band, what it covers and who teaches it, before you pay anything.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* Catalogue first, sign-up second: the visitor has just watched a
              demo and wants to see what it costs, not to make an account. */}
          <Link
            href="/explore"
            className="flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-sm font-bold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-97 sm:w-auto"
          >
            Browse courses <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="flex h-12 w-full max-w-xs items-center justify-center rounded-xl border border-border bg-card px-7 text-sm font-bold text-foreground transition-colors hover:bg-muted active:scale-97 sm:w-auto"
          >
            Create a free account
          </Link>
        </div>
      </div>
    </section>
  );
}
