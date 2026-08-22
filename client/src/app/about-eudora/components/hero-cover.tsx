import { ArrowDown } from "lucide-react";
import * as React from "react";

import { CloudShape } from "@/components/decorative/cloud-shape";

import { LandingLottie } from "../../landing/components/landing-lottie";

/**
 * The half-page cover.
 *
 * Static by design: this replaced a scroll-driven version that pinned the
 * scene and shrank it, cycling Clio through three clips as you scrolled. One
 * mascot, no transforms — which also means no rAF scroll listener and nothing
 * that behaves differently between browsers.
 */
export function HeroCover() {
  return (
    <section className="relative flex min-h-[55vh] items-center overflow-hidden px-6 py-16 md:py-20">
      {/* Ambient wash — same palette as the /explore cover */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-0 left-1/4 h-72 w-72 -translate-y-1/3 rounded-full bg-gradient-to-br from-[#241546]/[0.08] to-transparent blur-3xl" />
        <div className="absolute right-0 bottom-0 h-64 w-64 translate-y-1/4 rounded-full bg-gradient-to-tl from-amber-300/[0.14] to-transparent blur-3xl" />
        <CloudShape className="top-8 left-[6%] h-10 w-28 text-[#241546]/[0.07] md:top-10" />
        <CloudShape className="top-20 right-[10%] h-8 w-24 text-amber-400/[0.16] md:top-16" />
        <CloudShape className="top-1/2 right-[4%] hidden h-9 w-24 text-fuchsia-400/[0.10] lg:block" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm select-none">
          Meet Eudora
        </span>

        <h1 className="font-display mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Screens your kids <br className="hidden sm:inline" />
          actually learn from.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          An AI tutor that asks questions instead of autoplaying, real teachers behind it, and a
          parent view that shows you exactly what happened.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
          <ArrowDown className="h-3.5 w-3.5 animate-bounce" aria-hidden="true" />
          Scroll to try it yourself
        </div>
      </div>

      {/* Clio, on her way to school. LandingLottie rather than a raw player so
          she holds on the first frame for visitors who ask for reduced motion. */}
      <LandingLottie
        src="/lottie/mascot-clio-going-to-school-with-bag-and-a-bird.lottie"
        ariaLabel="Clio, the Eudora tutor, walking to school with her bag and a bird"
        className="pointer-events-none absolute bottom-0 left-6 hidden h-44 w-44 sm:block md:left-20 md:h-56 md:w-56"
      />
    </section>
  );
}
