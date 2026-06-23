import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="border-t border-neutral-200/40 bg-neutral-50 py-24 select-none">
      <div className="mx-auto max-w-4xl px-6">
        {/* CTA Card */}
        <div className="flex flex-col items-center space-y-6 rounded-[24px] border border-neutral-200/80 bg-white p-8 text-center shadow-[0_24px_50px_rgba(0,0,0,0.02)] md:p-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50/50 px-3 py-1 text-[9px] font-bold tracking-widest text-neutral-500 uppercase">
            <Sparkles className="h-3 w-3 text-neutral-800" />
            Get Started
          </div>

          {/* Heading */}
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Transform your classroom today.
          </h2>

          {/* Description */}
          <p className="max-w-lg text-xs leading-relaxed text-neutral-400 sm:text-sm">
            Get started with the AI-powered education operating system. Save hours of lesson prep
            and grading, and improve student learning outcomes.
          </p>

          {/* Actions */}
          <div className="pt-2">
            <Link href="/login">
              <button className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 text-sm font-semibold text-white shadow-md shadow-neutral-900/10 transition-all hover:bg-neutral-800 active:scale-97">
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
