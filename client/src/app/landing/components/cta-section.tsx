import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CtaSection() {
  return (
    <section className="py-24 bg-neutral-50 border-t border-neutral-200/40 select-none">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* CTA Card */}
        <div className="bg-white border border-neutral-200/80 rounded-[24px] p-8 md:p-16 text-center shadow-[0_24px_50px_rgba(0,0,0,0.02)] flex flex-col items-center space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-neutral-200 bg-neutral-50/50 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-neutral-800" />
            Get Started
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 font-display">
            Transform your classroom today.
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg leading-relaxed">
            Get started with the AI-powered education operating system. Save hours of lesson prep and grading, and improve student learning outcomes.
          </p>

          {/* Actions */}
          <div className="pt-2">
            <Link href="/login">
              <button className="h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm px-6 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-neutral-900/10 active:scale-97">
                Deploy Your App
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
