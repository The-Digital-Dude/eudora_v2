import type { Metadata } from "next";

import { SITE_NAME } from "@/config/site";
import { absoluteUrl } from "@/lib/public-catalog";

import { StoryPlayer } from "./story-player";

const TITLE = "Read a story with Eudora";
const DESCRIPTION =
  "Listen to a narrated story and ask questions about it out loud. No account needed — the storyteller answers from the story itself, and only as far as you have read.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/story-demo" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/story-demo"),
    type: "website",
  },
};

/**
 * Unlike /about-eudora, which is scripted client-side and prerenders, this one
 * genuinely calls the API: the point is that the voice and the answers are
 * real. It therefore needs the API to be up, and it is capped server-side
 * because anyone can reach it.
 */
export default function StoryDemoPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {SITE_NAME} · live demo
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {TITLE}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Press <strong>Read to me</strong> to hear it, then ask the storyteller
          anything about what is happening. She answers only from the story —
          and only as far as you have read.
        </p>
      </header>

      <div className="mt-10">
        <StoryPlayer />
      </div>
    </main>
  );
}
