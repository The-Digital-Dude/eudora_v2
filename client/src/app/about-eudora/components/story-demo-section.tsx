"use client";

import { useCallback, useEffect, useState } from "react";

import { StoryReader } from "@/components/story/story-reader";
import type { AgentReply, AskPayload, Story } from "@/features/stories/types";

import { SectionShell } from "./section-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * The one section on this page that is not scripted.
 *
 * Everything else here is client-side theatre so the page keeps working when
 * the API is down. This one makes real calls to real speech and language
 * providers, which is the point — a narrator that answers a made-up question
 * proves nothing. The cost is that this section, alone, depends on the API
 * being up and on a metered budget being unspent, so it fails quietly and
 * leaves the rest of the page intact rather than taking it down.
 *
 * Plain fetch rather than the app's RTK client: a visitor here has no session,
 * and the shared base query attaches credentials and runs a token-refresh
 * interceptor on 401, neither of which means anything to them.
 */

/**
 * A demo session id, minted per browser. A continuity token so the conversation
 * holds together across requests, not a credential — the server grants nothing
 * on the strength of it beyond the demo's own caps.
 */
function useDemoSessionId() {
  const [id] = useState(() => {
    if (typeof window === "undefined") return "";
    const KEY = "eudora.storyDemoSession";
    try {
      const existing = window.localStorage.getItem(KEY);
      if (existing) return existing;
      const minted = crypto.randomUUID();
      window.localStorage.setItem(KEY, minted);
      return minted;
    } catch {
      // Private browsing denies storage; a per-load id still works, it just
      // starts a fresh conversation on reload.
      return crypto.randomUUID();
    }
  });
  return id;
}

export function StoryDemoSection() {
  const [story, setStory] = useState<Story | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const demoSessionId = useDemoSessionId();

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/stories/demo`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (!body.success) throw new Error(body.message ?? "No demo story");
        setStory(body.data);
      })
      .catch(() => !cancelled && setUnavailable(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const ask = useCallback(
    async (payload: AskPayload): Promise<AgentReply> => {
      const response = await fetch(`${API_URL}/api/stories/demo/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, demoSessionId }),
      });
      const body = await response.json();
      if (!body.success) {
        throw new Error(
          body.errors?.[0]?.message ?? body.message ?? "Something went wrong",
        );
      }
      return body.data;
    },
    [demoSessionId],
  );

  // Nothing at all rather than an apology: a visitor who never knew this
  // section existed is better served than one told a feature is broken.
  if (unavailable) return null;

  return (
    <SectionShell
      tinted
      eyebrow="Read together"
      title="A story that answers back"
      lede="Press play to hear it, then ask her anything about what is happening. She answers only from the story — and only as far as you have read."
    >
      {story ? (
        <div className="mx-auto max-w-5xl">
          <StoryReader
            story={story}
            onAsk={ask}
            capNotice={(left) =>
              left > 0
                ? `${left} more question${left === 1 ? "" : "s"} in this demo`
                : "That is all the demo can answer — sign up to keep reading together."
            }
          />
        </div>
      ) : (
        <p className="mx-auto max-w-md animate-pulse rounded-xl border p-8 text-center text-sm text-muted-foreground">
          Opening the book…
        </p>
      )}
    </SectionShell>
  );
}
