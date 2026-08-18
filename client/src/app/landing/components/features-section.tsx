"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="border-t border-border/40 bg-background py-20 select-none"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 md:grid-cols-[1fr_auto]">
        <div className="mx-auto max-w-xl space-y-3 text-center md:mx-0 md:text-left">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm">
            Features
          </span>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Built for learning. Engineered for classrooms.
          </h2>
          <p className="text-xs leading-normal text-muted-foreground sm:text-sm">
            Everything you need to design personalized curriculums, automate grading, and run live
            interactive lectures.
          </p>
        </div>

        {/* Robie, walking through what Eudora can do */}
        <div className="flex justify-center">
          <div className="h-40 w-40 md:h-48 md:w-48">
            <DotLottieReact
              src="/lottie/mascot-robie-talking-explain.lottie"
              loop
              autoplay
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
