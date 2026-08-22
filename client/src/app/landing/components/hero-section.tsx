import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CloudShape } from "@/components/decorative/cloud-shape";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background pt-6 pb-10 md:pt-10 md:pb-16">
      {/* Background Soft Ambient Light */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[350px] w-full max-w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-neutral-200/20 to-transparent blur-[100px] filter" />

      {/* The same cloud motif the /explore and /about-eudora covers use. The
          landing hero was the only one of the three without it, which made it
          the flattest page on the site. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <CloudShape className="top-10 left-[4%] h-9 w-24 text-[#241546]/[0.06]" />
        <CloudShape className="top-24 right-[8%] hidden h-8 w-22 text-amber-400/[0.14] md:block" />
        <CloudShape className="top-[46%] left-[38%] hidden h-6 w-16 text-fuchsia-400/[0.08] lg:block" />
        <CloudShape className="right-[18%] bottom-16 hidden h-7 w-20 text-teal-400/[0.10] md:block" />
        <CloudShape className="bottom-6 left-[12%] hidden h-6 w-16 text-amber-400/[0.10] sm:block" />
      </div>

      {/* Centred rather than top-aligned at every width. `md:items-start` used
          to top-align the two columns, which left the headline floating high
          against a tall portrait photo. Centring lines their midpoints up on
          its own, so the balance survives the copy getting longer or shorter. */}
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-10">
        {/* Left: Photo. Capped at `max-w-sm` rather than `max-w-md`: it is a
            tall portrait, and now that the search block is gone the text
            column is short enough that a bigger image reopens the empty bands
            either side of it. */}
        <div className="animate-fade-in-up order-2 flex justify-center md:order-1">
          <div className="relative w-full max-w-sm">
            <Image
              src="/landing/hero_side_image.png"
              alt="Students exploring their personalized Eudora course dashboard"
              width={874}
              height={1138}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>

        {/* Right: Content */}
        <div className="order-1 text-center md:order-2 md:text-left">
          <div className="animate-fade-in-up mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm select-none">
            For Kids, Pre-K to Grade 6
          </div>

          <h1 className="font-display animate-fade-in-up mb-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Screens your kids <br className="hidden sm:inline" />
            actually learn from.
          </h1>

          <p
            className="animate-fade-in-up mx-auto mb-8 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base md:mx-0"
            style={{ animationDelay: "0.1s" }}
          >
            An AI tutor that stops and asks a question every few minutes, real teachers running
            live cohorts, and a parent view that shows you what your child actually did.
          </p>

          {/* The hero's only action now that the search block is gone, so it
              takes the solid treatment the Search button used to have. */}
          <div
            className="animate-fade-in-up flex justify-center md:justify-start"
            style={{ animationDelay: "0.2s" }}
          >
            <Link
              href="/about-eudora"
              className="flex h-12 items-center gap-2 rounded-xl bg-foreground px-7 text-sm font-bold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-97"
            >
              Try a lesson
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
