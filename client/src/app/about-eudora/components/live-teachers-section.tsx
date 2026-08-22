import { CalendarRange, Radio, UserCheck, Users } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { SectionShell } from "./section-shell";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** The cohort's weekly pattern — Tue/Thu, matching how a real batch is set up. */
const MEETING_DAYS = new Set(["Tue", "Thu"]);

const FACTS = [
  {
    icon: Users,
    title: "A small cohort, not an audience",
    body: "Every live course is sold as a seat in a batch with a capped size and a named lead teacher.",
  },
  {
    icon: CalendarRange,
    title: "A fixed weekly slot",
    body: "The cohort meets on the same days at the same time, and the whole term's sessions are scheduled up front.",
  },
  {
    icon: UserCheck,
    title: "Attendance the teacher marks",
    body: "Present, late or absent, recorded per session by the person who ran it, visible to you the same day.",
  },
];

export function LiveTeachersSection() {
  return (
    <SectionShell
      id="real-teachers"
      eyebrow="The other half"
      title="Clio handles the practice. Teachers do the teaching."
      lede={
        <>
          A real teacher writes the lesson, runs the live sessions and marks the register.
          That&apos;s the part we didn&apos;t automate. Below is how a cohort is set up. It is an
          example, not a class you can book from this page.
        </>
      }
    >
      {/* The two photographs carry the claim the copy makes: a named person on
          the other end, and few enough children that they all fit on one
          screen. Both captions state something the product actually enforces
          (a capacity, and a weekly meeting pattern) rather than a mood. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <figure>
          <Image
            src="/landing/teacher_teaching_online_2.jpg"
            alt="A teacher wearing a headset holds up a globe to her screen, where four children are watching on a video call"
            width={1000}
            height={667}
            sizes="(min-width: 640px) 50vw, 100vw"
            className="aspect-[3/2] w-full rounded-3xl border border-border object-cover shadow-sm"
          />
          <figcaption className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            Cohorts are capped, so the teacher can see everyone at once.
          </figcaption>
        </figure>

        <figure>
          <Image
            src="/landing/teacher_teaching_online_1.jpg"
            alt="A teacher holding a small whiteboard up to her laptop camera during a live lesson"
            width={730}
            height={473}
            sizes="(min-width: 640px) 50vw, 100vw"
            className="aspect-[3/2] w-full rounded-3xl border border-border object-cover shadow-sm"
          />
          <figcaption className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            Live sessions land on the same weekday and time every week.
          </figcaption>
        </figure>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr] md:gap-6">
        {/* A cohort's week, drawn the way a batch is actually configured */}
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Radio className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                Multiplication & Fractions
              </p>
              <p className="truncate text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Example cohort · Grades 3–4
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-1.5">
            {DAYS.map((day) => {
              const meets = MEETING_DAYS.has(day);
              return (
                <div
                  key={day}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 ${
                    meets
                      ? "border-primary/40 bg-primary/[0.07]"
                      : "border-border/60 bg-muted/30"
                  }`}
                >
                  <span
                    className={`text-[9px] font-bold tracking-wider uppercase ${
                      meets ? "text-primary" : "text-muted-foreground/60"
                    }`}
                  >
                    {day}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      meets ? "bg-primary" : "bg-transparent"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="font-bold tracking-wider text-muted-foreground uppercase">Meets</dt>
              <dd className="mt-1 font-semibold text-foreground">Tue & Thu, 16:00</dd>
            </div>
            <div>
              <dt className="font-bold tracking-wider text-muted-foreground uppercase">Session</dt>
              <dd className="mt-1 font-semibold text-foreground">45 minutes</dd>
            </div>
            <div>
              <dt className="font-bold tracking-wider text-muted-foreground uppercase">Cohort</dt>
              <dd className="mt-1 font-semibold text-foreground">Capped at 12</dd>
            </div>
            <div>
              <dt className="font-bold tracking-wider text-muted-foreground uppercase">Teacher</dt>
              <dd className="mt-1 font-semibold text-foreground">One named lead</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-center gap-5 rounded-3xl border border-border bg-card p-6 md:p-8">
          {FACTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
