"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import { CloudShape } from "@/components/decorative/cloud-shape";

// Decorative backdrop for the top half of the programme page — same
// treatment as /explore's header (gradient wash + clouds), but with the
// Wompush mascot instead of Clio since this isn't a course-search context.
export function ProgramHeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50vh] min-h-[420px] overflow-hidden border-b border-border/50">
      {/* Soft ambient gradient wash */}
      <div className="absolute top-0 left-1/4 h-72 w-72 -translate-y-1/3 rounded-full bg-gradient-to-br from-[#241546]/[0.06] to-transparent blur-3xl" />
      <div className="absolute right-0 bottom-0 h-64 w-64 translate-y-1/4 rounded-full bg-gradient-to-tl from-amber-300/[0.10] to-transparent blur-3xl" />

      {/* Decorative clouds — brand-tinted, no image asset */}
      <CloudShape className="top-8 left-[6%] h-10 w-28 text-[#241546]/[0.07] md:top-10" />
      <CloudShape className="top-20 right-[10%] h-8 w-24 text-amber-400/[0.14] md:top-16" />

      {/* Wompush, waving hello */}
      <div className="absolute right-6 bottom-4 hidden sm:block md:right-16">
        <DotLottieReact
          src="/lottie/wompush-charecter-waving-hello.lottie"
          loop
          autoplay
          className="h-32 w-32 md:h-40 md:w-40"
        />
      </div>
    </div>
  );
}
