"use client";

import { useCallback, useEffect, useState } from "react";

import { StoryReader } from "@/components/story/story-reader";
import type { AgentReply, AskPayload, Story } from "@/features/stories/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Plain fetch rather than the app's RTK Query client, on purpose: this page has
 * to work with no session at all, and the shared base query attaches
 * credentials and runs a token-refresh interceptor on 401 — neither of which
 * means anything to a visitor who has never signed in.
 */

/**
 * A demo session id, minted per browser. It is a continuity token so the
 * conversation holds together across requests, not a credential — the server
 * grants nothing on the strength of it beyond the demo's own caps.
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

export function StoryPlayer() {
  const [story, setStory] = useState<Story | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      .catch((error: Error) => !cancelled && setLoadError(error.message));
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

  if (loadError) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        The demo story is not available right now.
      </p>
    );
  }
  if (!story) {
    return (
      <p className="animate-pulse rounded-lg border p-8 text-center text-muted-foreground">
        Opening the book…
      </p>
    );
  }

  return (
    <StoryReader
      story={story}
      onAsk={ask}
      capNotice={(left) =>
        left > 0
          ? `${left} more question${left === 1 ? "" : "s"} in this demo`
          : "That is all the demo can answer — sign up to keep reading together."
      }
    />
  );
}
