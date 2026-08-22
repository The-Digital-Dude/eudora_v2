"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { CalendarCheck, ClipboardCheck, Flame, NotebookPen, Sparkles, Wallet } from "lucide-react";
import * as React from "react";

import { DEMO_LESSON, DEMO_TOTAL_XP } from "./demo-lesson";
import { SectionShell } from "./section-shell";

/**
 * Everything named here is a panel that exists in the family portal today —
 * report card, attendance, homework, purchases. Nothing on this page promises
 * a capability that isn't built; a parent who buys on the strength of a
 * marketing claim and can't find it is a refund, not a customer.
 */
const PARENT_VIEW = [
  {
    icon: ClipboardCheck,
    title: "Report card",
    body: "Term average, marks per subject, and where they sit in the class, the same numbers the teacher sees.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance",
    body: "A calendar per child. Every live session marked present, late or absent, by the teacher who ran it.",
  },
  {
    icon: NotebookPen,
    title: "Homework",
    body: "What was set, what's been handed in, what's still open, and you can submit on their behalf.",
  },
  {
    icon: Wallet,
    title: "What you've paid for",
    body: "Every course your family owns, when access ends, and the receipts. No mystery renewals.",
  },
];

export function ProgressSection({
  earnedXp,
  demoComplete,
}: {
  earnedXp: number;
  demoComplete: boolean;
}) {
  const progress = Math.min(1, earnedXp / DEMO_TOTAL_XP);

  return (
    <SectionShell
      id="what-parents-see"
      tinted
      backdrop={{
        src: "/landing/raheel_learning_backdrop.jpg",
        alt: "A child pointing at a monitor showing a Eudora coordinate question, with Clio in the corner of the screen",
      }}
      eyebrow="For parents"
      title="A detailed record of every lesson and session."
      lede={
        <>
          Your child sees XP and a streak. You see the record behind it: attendance marked by their
          teacher, marks by subject, and any work still outstanding. Both views are drawn from the
          same underlying data, so there is one account of your child&apos;s progress rather than
          two.
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* The child's view — wired to whatever the visitor just did above */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            What your child sees
          </p>

          {demoComplete && (
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <DotLottieReact
                src="/lottie/confetti-effect-from-bottom.lottie"
                autoplay
                className="h-full w-full"
              />
            </div>
          )}

          <div className="relative mt-5 flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-xl border border-warning/20 bg-warning/10 px-3 py-1.5 text-sm font-extrabold text-warning">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {earnedXp} XP
            </span>
            <span className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-sm font-extrabold text-foreground">
              <Flame className="h-4 w-4 text-destructive" aria-hidden="true" />3 day streak
            </span>
          </div>

          <div className="relative mt-6">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              <span>{DEMO_LESSON.title}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {earnedXp === 0
                ? "Answer a card in the demo above and this fills in. It's reading what you just did."
                : demoComplete
                  ? "Lesson complete. In the real app this is where the streak ticks over."
                  : "Keep going. The bar only moves when a card is actually answered."}
            </p>
          </div>
        </div>

        {/* The parent's view */}
        {/* Opaque, not a 4% tint. This card used to be `bg-primary/[0.04]`,
            which was fine over a plain section but lets the backdrop photo read
            straight through the text now that there is one. `color-mix` keeps
            the same faint primary wash while staying fully opaque, and still
            follows whichever theme preset is active. */}
        <div className="rounded-3xl border-2 border-primary/30 bg-[color-mix(in_oklab,var(--primary)_5%,var(--card))] p-6 md:p-8">
          <p className="text-[10px] font-bold tracking-widest text-primary uppercase">
            What you see
          </p>
          <ul className="mt-5 space-y-5">
            {PARENT_VIEW.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
