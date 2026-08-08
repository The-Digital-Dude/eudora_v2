import { ArrowRight, Mail } from "lucide-react";

const CONTACT_EMAIL = "shibly.work@gmail.com";

export default function ContactSection() {
  return (
    <section id="contact" className="border-t border-border/40 bg-background py-24 select-none">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center space-y-6 rounded-3xl border border-border/50 bg-card p-8 text-center shadow-[0_24px_50px_rgba(0,0,0,0.02)] md:p-16">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-3 py-1 text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
            <Mail className="h-3 w-3 text-foreground" />
            Talk to us
          </div>

          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Questions before you commit?
          </h2>

          <p className="max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Reach out and we&apos;ll walk you through the platform, pricing, and what onboarding your
            campus would look like.
          </p>

          <div className="pt-2">
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <button className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-foreground/10 transition-all hover:bg-foreground/90 active:scale-97">
                {CONTACT_EMAIL}
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
