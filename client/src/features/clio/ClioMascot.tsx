"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import React, { useEffect, useState } from "react";

export type MascotState =
  | "idle"
  | "thinking"
  | "celebrate"
  | "encourage"
  | "wrong"
  | "greeting"
  | "confused"
  | "hint"
  | "milestone";

export type MascotVariant = "standing" | "chair";

interface ClioMascotProps {
  state: MascotState;
  variant?: MascotVariant;
  size?: number;
}

interface MascotAnimation {
  src: string;
  loop: boolean;
}

// Per-state, per-variant clip lookup. Missing cells fall back through
// resolveAnimation() below (chair -> standing -> idle) so a new variant
// can be added later by filling in only the states that need it.
const MASCOT_ANIMATIONS: Record<MascotState, Partial<Record<MascotVariant, MascotAnimation>>> = {
  idle: {
    standing: { src: "/lottie/mascot-clio-standing-idle.lottie", loop: true },
  },
  greeting: {
    standing: { src: "/lottie/mascot-clio-waving-hello.lottie", loop: true },
  },
  thinking: {
    standing: { src: "/lottie/mascot-clio-walking-small-steps.lottie", loop: true },
    chair: { src: "/lottie/mascot-clio-waiting-for-answer-on-chair.lottie", loop: true },
  },
  hint: {
    chair: { src: "/lottie/mascot-on-chair-talking.lottie", loop: true },
  },
  encourage: {
    // No dedicated clip yet — the wave reads as a friendly nudge.
    standing: { src: "/lottie/mascot-clio-waving-hello.lottie", loop: true },
  },
  confused: {
    // No dedicated clip yet — the nod-wrong head-tilt reads as confusion.
    standing: { src: "/lottie/mascot-clio-noding-wrong-answer-standing.lottie", loop: true },
  },
  celebrate: {
    standing: { src: "/lottie/mascot-clio-cheering-right-answer-standing.lottie", loop: false },
    chair: { src: "/lottie/mascot-clio-cheering-right-answer-on-chair.lottie", loop: false },
  },
  wrong: {
    standing: { src: "/lottie/mascot-clio-noding-wrong-answer-standing.lottie", loop: false },
    chair: { src: "/lottie/mascot-clio-noding-wrong-answer-on-chair.lottie", loop: false },
  },
  milestone: {
    standing: { src: "/lottie/mascot-clio-cheering-with-winner-cup-standing.lottie", loop: false },
  },
};

// Global in-memory cache to prevent redundant HTTP requests and avoid AbortError when rapid transitions occur
const lottieBufferCache = new Map<string, ArrayBuffer>();
const pendingFetches = new Map<string, Promise<ArrayBuffer | null>>();

async function fetchAndCacheLottie(src: string): Promise<ArrayBuffer | null> {
  if (lottieBufferCache.has(src)) return lottieBufferCache.get(src)!;
  if (pendingFetches.has(src)) return pendingFetches.get(src)!;

  const fetchPromise = (async () => {
    try {
      const res = await fetch(src);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      lottieBufferCache.set(src, buf);
      return buf;
    } catch {
      return null;
    } finally {
      pendingFetches.delete(src);
    }
  })();

  pendingFetches.set(src, fetchPromise);
  return fetchPromise;
}

// Preload all mascot assets at module initialization in browser
if (typeof window !== "undefined") {
  const allUrls = new Set<string>();
  Object.values(MASCOT_ANIMATIONS).forEach((entry) => {
    if (entry.standing?.src) allUrls.add(entry.standing.src);
    if (entry.chair?.src) allUrls.add(entry.chair.src);
  });
  allUrls.forEach((url) => {
    void fetchAndCacheLottie(url);
  });
}

function resolveAnimation(state: MascotState, variant: MascotVariant): MascotAnimation {
  const forState = MASCOT_ANIMATIONS[state];
  return (
    forState[variant] ??
    forState.standing ??
    MASCOT_ANIMATIONS.idle.standing! // idle/standing is always defined — safe fallback of last resort
  );
}

export function ClioMascot({ state, variant = "standing", size = 120 }: ClioMascotProps) {
  const animation = resolveAnimation(state, variant);
  const [data, setData] = useState<ArrayBuffer | null>(() => lottieBufferCache.get(animation.src) ?? null);

  useEffect(() => {
    let active = true;
    const cached = lottieBufferCache.get(animation.src);
    if (cached) {
      setData(cached);
      return;
    }

    void fetchAndCacheLottie(animation.src).then((buf) => {
      if (active && buf) {
        setData(buf);
      }
    });

    return () => {
      active = false;
    };
  }, [animation.src]);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      {data ? (
        <DotLottieReact
          key={animation.src}
          data={data}
          loop={animation.loop}
          autoplay
          className="h-full w-full object-contain"
        />
      ) : (
        <DotLottieReact
          key={animation.src}
          src={animation.src}
          loop={animation.loop}
          autoplay
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}
