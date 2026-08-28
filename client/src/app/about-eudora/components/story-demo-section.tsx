import { ArrowRight, BookHeadphones, Ear, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { SectionShell } from "./section-shell";

/**
 * The one place on the marketing site that hands the visitor a live product
 * rather than a description of one.
 *
 * Every other demo on this page is scripted client-side so it keeps working
 * when the API is down. This section deliberately links out instead of
 * embedding: /story-demo makes real calls to real speech and language
 * providers, and inlining it here would make the whole marketing page depend on
 * them being up and on a metered budget being unspent.
 */
const POINTS = [
  {
    icon: Ear,
    title: "She reads it aloud",
    body: "A narrated story with the words lighting up as they are spoken, so a child who is still learning to read can follow along.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Your child can interrupt",
    body: "They can ask why something happened, out loud, and get an answer — the way they would with a person reading to them.",
  },
  {
    icon: BookHeadphones,
    title: "She only knows the story",
    body: "Answers come from the story itself, and only from the part your child has actually reached. She will not invent, and she will not wander off the page.",
  },
];

export function StoryDemoSection() {
  return (
    <SectionShell
      tinted
      eyebrow="Read together"
      title="A story that answers back"
      lede="No account, no card. Open it and ask it something."
    >
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-2">
            <Icon className="h-6 w-6 text-primary" aria-hidden />
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/story-demo"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-sm font-bold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-97"
        >
          Read a story with Eudora <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SectionShell>
  );
}
