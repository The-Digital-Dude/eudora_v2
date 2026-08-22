import { ArrowRight, MessageCircleQuestion, Radio, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { LandingLottie } from "./landing-lottie";

/**
 * Three things Eudora actually does.
 *
 * This section previously announced "Features", said "everything you need to
 * design personalized curriculums, automate grading, and run live interactive
 * lectures", and then listed nothing at all — a heading, a mascot and a claim
 * aimed at a school administrator who was never the buyer.
 */
const FEATURES = [
  {
    icon: MessageCircleQuestion,
    title: "An AI tutor that asks",
    body: "Clio works through lesson cards a teacher wrote. Every card ends in a question, and nothing advances until your child answers it. Get it wrong and she hints rather than just marking it red.",
  },
  {
    icon: Radio,
    title: "Real teachers, small cohorts",
    body: "Live courses are sold as a seat in a capped cohort with a named lead teacher and a fixed weekly slot. The teacher marks the register each session.",
  },
  {
    icon: ShieldCheck,
    title: "A parent view worth checking",
    body: "Report card, attendance calendar, homework status, and every course you've paid for with the date access ends. The same record the teacher sees.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border/40 bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="mx-auto max-w-xl space-y-3 text-center md:mx-0 md:text-left">
            <span className="inline-block rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm">
              What you get
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              Half an hour that asks something of them.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your child is going to spend that time on a screen either way. Eudora is built to sit
              in exactly that slot: same device, opposite habit.
            </p>
          </div>

          <LandingLottie
            src="/lottie/mascot-robie-talking-explain.lottie"
            className="mx-auto h-40 w-40 md:h-48 md:w-48"
          />
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-border bg-card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="font-display mt-4 text-base font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/about-eudora"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Try a lesson card yourself
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
