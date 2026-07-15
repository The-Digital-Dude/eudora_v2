import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="border-t border-border/40 bg-background py-24 select-none">
      <div className="mx-auto max-w-4xl px-6">
        {/* CTA Card */}
        <div className="flex flex-col items-center space-y-6 rounded-3xl border border-border/50 bg-card p-8 text-center shadow-[0_24px_50px_rgba(0,0,0,0.02)] md:p-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-3 py-1 text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
            <Sparkles className="h-3 w-3 text-foreground" />
            Get Started
          </div>

          {/* Heading */}
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Transform your classroom today.
          </h2>

          {/* Description */}
          <p className="max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Get started with the AI-powered education operating system. Save hours of lesson prep
            and grading, and improve student learning outcomes.
          </p>

          {/* Actions */}
          <div className="pt-2">
            <Link href="/login">
              <button className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-foreground/10 transition-all hover:bg-foreground/90 active:scale-97">
                Deploy Your App
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
