"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { spokenCharCount, type Timings } from "./narration-timings";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/** Mirrors the shape `/api/stories/demo` returns. */
interface Segment {
  id: string;
  text: string;
  narrationUrl: string | null;
  narrationDurationMs: number | null;
  narrationTimings: Timings | null;
  assets: { id: string; url: string; altText: string }[];
}
interface Chapter {
  id: string;
  title: string | null;
  segments: Segment[];
}
interface Story {
  id: string;
  title: string;
  synopsis: string | null;
  cover: { url: string; altText: string } | null;
  chapters: Chapter[];
  characters: { id: string; name: string; description: string | null }[];
}
interface Exchange {
  question: string;
  answer: string;
  pending?: boolean;
}

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
  const [page, setPage] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [spokenChars, setSpokenChars] = useState(0);

  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [turnsLeft, setTurnsLeft] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const conversationRef = useRef<string | undefined>(undefined);
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

  /** Flattened, because the reader turns pages rather than chapters. */
  const pages = useMemo(
    () =>
      (story?.chapters ?? []).flatMap((chapter) =>
        chapter.segments.map((segment) => ({ chapter, segment })),
      ),
    [story],
  );
  const current = pages[page];

  // Stop whatever is speaking when the page turns, so two segments can never
  // read over each other.
  useEffect(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setSpokenChars(0);
  }, [page]);

  /**
   * Word highlighting, driven by the character timings the speech provider
   * returned at generation time. Reading `currentTime` on each frame rather
   * than running a timer keeps the highlight locked to the audio even if the
   * tab throttles or the audio buffers.
   */
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    const tick = () => {
      const audio = audioRef.current;
      const timings = current?.segment.narrationTimings;
      if (audio && timings) {
        setSpokenChars(spokenCharCount(timings, audio.currentTime));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, current]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(() => setPlaying(true));
  }, [playing]);

  const send = useCallback(
    async (payload: { text?: string; audio?: string; audioMimeType?: string }) => {
      const label = payload.text ?? "🎤 …";
      setExchanges((prior) => [
        ...prior,
        { question: label, answer: "", pending: true },
      ]);
      setAsking(true);
      setAskError(null);

      try {
        const response = await fetch(`${API_URL}/api/stories/demo/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            demoSessionId,
            segmentId: current?.segment.id,
            conversationId: conversationRef.current,
          }),
        });
        const body = await response.json();
        if (!body.success) {
          throw new Error(
            body.errors?.[0]?.message ?? body.message ?? "Something went wrong",
          );
        }

        conversationRef.current = body.data.conversationId;
        setTurnsLeft(body.data.turnsRemaining);
        setExchanges((prior) => [
          ...prior.slice(0, -1),
          { question: body.data.childText, answer: body.data.replyText },
        ]);

        if (body.data.replyAudio) {
          const audio = new Audio(
            `data:${body.data.replyAudioMimeType};base64,${body.data.replyAudio}`,
          );
          replyAudioRef.current = audio;
          void audio.play();
        }
      } catch (error) {
        setExchanges((prior) => prior.slice(0, -1));
        setAskError((error as Error).message);
      } finally {
        setAsking(false);
      }
    },
    [current, demoSessionId],
  );

  /** Push-to-talk. Held down to record, released to send. */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(buffer)),
        );
        void send({ audio: base64, audioMimeType: recorder.mimeType });
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setAskError("I could not reach the microphone — you can type instead.");
    }
  }, [send]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  if (loadError) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        The demo story is not available right now.
      </p>
    );
  }
  if (!story || !current) {
    return (
      <p className="animate-pulse rounded-lg border p-8 text-center text-muted-foreground">
        Opening the book…
      </p>
    );
  }

  const { segment, chapter } = current;
  const illustration = segment.assets[0] ?? story.cover;

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      {/* ── The book ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{story.title}</h2>
            {chapter.title ? (
              <p className="text-sm text-muted-foreground">{chapter.title}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {page + 1} / {pages.length}
          </span>
        </div>

        {illustration ? (
          // Plain <img> rather than next/image on purpose: story art is served
          // by our own API, whose host is not in next.config's remotePatterns
          // (that list is derived from S3_PUBLIC_URL), so next/image would
          // refuse to optimise it and fail the request outright.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_URL}${illustration.url}`}
            alt={illustration.altText}
            className="mt-4 aspect-[3/2] w-full rounded-xl object-cover"
          />
        ) : null}

        <p className="mt-6 text-lg leading-relaxed">
          {segment.narrationTimings ? (
            <Highlighted text={segment.text} spoken={spokenChars} />
          ) : (
            segment.text
          )}
        </p>

        {segment.narrationUrl ? (
          <audio
            ref={audioRef}
            src={`${API_URL}${segment.narrationUrl}`}
            onEnded={() => {
              setPlaying(false);
              setSpokenChars(segment.text.length);
            }}
            preload="auto"
          />
        ) : null}

        <div className="mt-6 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Back
          </Button>
          <Button
            onClick={play}
            disabled={!segment.narrationUrl}
            className="min-w-28"
          >
            {playing ? "Pause" : "Read to me"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={page === pages.length - 1}
          >
            Next
          </Button>
        </div>
      </div>

      {/* ── The conversation ──────────────────────────────────────────── */}
      <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Ask about the story</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          She only knows this story, and only as far as you have read.
        </p>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
          {exchanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Try “Why did Bramble get wet?”
            </p>
          ) : null}
          {exchanges.map((exchange, index) => (
            <div key={index} className="space-y-1.5">
              <p className="text-sm font-medium">{exchange.question}</p>
              <p
                className={cn(
                  "rounded-lg bg-muted px-3 py-2 text-sm",
                  exchange.pending && "animate-pulse text-muted-foreground",
                )}
              >
                {exchange.pending ? "thinking…" : exchange.answer}
              </p>
            </div>
          ))}
        </div>

        {askError ? (
          <p className="mt-3 text-sm text-destructive">{askError}</p>
        ) : null}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const text = question.trim();
            if (!text || asking) return;
            setQuestion("");
            void send({ text });
          }}
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Type a question…"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            disabled={asking || turnsLeft === 0}
          />
          <Button
            type="button"
            variant={recording ? "destructive" : "outline"}
            aria-label="Hold to speak"
            // Pointer events rather than mouse/touch pairs: one set covers
            // mouse, pen and touch, and pointerup still fires if the finger
            // slides off the button mid-question.
            onPointerDown={startRecording}
            onPointerUp={stopRecording}
            onPointerLeave={() => recording && stopRecording()}
            disabled={asking || turnsLeft === 0}
          >
            {recording ? "Listening…" : "🎤"}
          </Button>
          <Button type="submit" disabled={asking || turnsLeft === 0}>
            Ask
          </Button>
        </form>

        {turnsLeft !== null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {turnsLeft > 0
              ? `${turnsLeft} more question${turnsLeft === 1 ? "" : "s"} in this demo`
              : "That is all the demo can answer — sign up to keep reading together."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Dims what has not been spoken yet. Split on the character index rather than
 * on words because that is the granularity the timings arrive in, and it keeps
 * the highlight honest through punctuation and hyphenation.
 */
function Highlighted({ text, spoken }: { text: string; spoken: number }) {
  return (
    <>
      <span>{text.slice(0, spoken)}</span>
      <span className="text-muted-foreground/50">{text.slice(spoken)}</span>
    </>
  );
}
