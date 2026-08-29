"use client";

import { ArrowLeft, BookOpen, Check, Globe, Library, Volume2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  useDetachStoryMutation,
  useGetStoryQuery,
  useNarrateStoryMutation,
  useSetStoryStatusMutation,
  useUpdateSegmentMutation,
} from "@/features/stories/storiesApi";
import type { Story, StorySegment } from "@/features/stories/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/** The tags the narrator understands. Offered as buttons so nobody has to remember them. */
const TAGS = [
  "excited",
  "nervously",
  "sadly",
  "whispers",
  "laughs",
  "curious",
  "gently",
  "proudly",
];

export default function StoryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: story, isLoading } = useGetStoryQuery(id);
  const [narrate, { isLoading: narrating }] = useNarrateStoryMutation();
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const segments = React.useMemo(
    () => (story?.chapters ?? []).flatMap((c) => c.segments),
    [story],
  );
  const narrated = segments.filter((s) => s.narrationUrl).length;

  const handleNarrate = async (force: boolean) => {
    setError(null);
    setResult(null);
    try {
      const r = await narrate({ storyId: id, force }).unwrap();
      setResult(
        `${r.generated} narrated, ${r.skipped} already done${
          r.failed ? `, ${r.failed} failed` : ""
        }.`,
      );
    } catch (e: any) {
      setError(
        e?.data?.errors?.[0]?.message ??
          e?.data?.message ??
          "Narration failed.",
      );
    }
  };

  if (isLoading) {
    return (
      <p className="animate-pulse p-6 text-xs text-muted-foreground">
        Loading story…
      </p>
    );
  }
  if (!story) {
    return <p className="p-6 text-xs text-muted-foreground">Story not found.</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/stories">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {story.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {segments.length} section{segments.length === 1 ? "" : "s"} ·{" "}
              <span className={narrated === segments.length ? "text-success" : ""}>
                {narrated} narrated
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleNarrate(false)}
            disabled={narrating}
            size="sm"
          >
            <Volume2 className="mr-1.5 h-4 w-4" />
            {narrating ? "Recording…" : "Narrate missing"}
          </Button>
          <Button
            onClick={() => handleNarrate(true)}
            disabled={narrating}
            variant="outline"
            size="sm"
          >
            Re-record all
          </Button>
        </div>
      </div>

      {result ? (
        <p className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
          {result}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <StoryPlacement story={story} narrated={narrated} pages={segments.length} />

      {story.isPublicDemo ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          <Globe className="h-3.5 w-3.5" />
          This is the story shown on the public demo page.
        </p>
      ) : null}

      <div className="space-y-6">
        {story.chapters.map((chapter) => (
          <div key={chapter.id} className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">
              {chapter.title}
            </h2>
            {chapter.segments.map((segment, index) => (
              <SegmentRow key={segment.id} segment={segment} index={index + 1} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Where this story is used, and who can reach it.
 *
 * Two independent facts, shown as two rows rather than one status, because
 * they genuinely are independent: a story can sit in a course, be published to
 * the library, be both, or be neither and simply exist.
 */
function StoryPlacement({
  story,
  narrated,
  pages,
}: {
  story: Story;
  narrated: number;
  pages: number;
}) {
  const [setStatus, { isLoading: saving }] = useSetStoryStatusMutation();
  const [detach, { isLoading: detaching }] = useDetachStoryMutation();
  const [error, setError] = React.useState<string | null>(null);

  const published = story.status === "PUBLISHED";
  const fullyNarrated = pages > 0 && narrated === pages;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.data?.message ?? "That did not work.");
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      {/* In a course */}
      <div className="flex flex-wrap items-center gap-3">
        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs text-foreground">
          {story.moduleItem ? (
            <>
              In a course as{" "}
              <strong className="font-bold">{story.moduleItem.title}</strong>
            </>
          ) : (
            "Not in any course"
          )}
        </span>
        {story.moduleItem ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={detaching}
            onClick={() => run(() => detach(story.id).unwrap())}
          >
            {detaching ? "Removing…" : "Take out of course"}
          </Button>
        ) : null}
      </div>

      {/* In the library */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-2">
        <Library className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs text-foreground">
          {published
            ? "Published — any student can read it"
            : "Not published to the story library"}
        </span>
        <Button
          variant={published ? "outline" : "default"}
          size="sm"
          className="ml-auto"
          // Publishing a half-narrated story gives a child a page of text
          // where they expected a voice, and the library filters those out
          // anyway — so it would publish to nowhere.
          disabled={saving || (!published && !fullyNarrated)}
          onClick={() =>
            run(() =>
              setStatus({
                storyId: story.id,
                status: published ? "DRAFT" : "PUBLISHED",
              }).unwrap(),
            )
          }
        >
          {saving ? "Saving…" : published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {!published && !fullyNarrated ? (
        <p className="text-[10px] text-muted-foreground">
          Narrate every section before publishing — {narrated} of {pages} done.
        </p>
      ) : null}
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * One page of the story: the words a child reads, and the performed version
 * spoken over them.
 *
 * The two are edited together because they are only valid as a pair — the
 * server refuses narration whose tags do not strip back to the displayed text,
 * so an editor that let them drift apart would just produce failures later.
 */
function SegmentRow({
  segment,
  index,
}: {
  segment: StorySegment;
  index: number;
}) {
  const [updateSegment, { isLoading: saving }] = useUpdateSegmentMutation();
  const [text, setText] = React.useState(segment.text);
  const [narrationText, setNarrationText] = React.useState(
    segment.narrationText ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setText(segment.text);
    setNarrationText(segment.narrationText ?? "");
  }, [segment.text, segment.narrationText]);

  const dirty =
    text !== segment.text || narrationText !== (segment.narrationText ?? "");

  /** Mirrors the server's rule, so the mismatch is visible before saving. */
  const stripped = narrationText.replace(/\[[^\]]*\]\s*/g, "");
  const mismatch = narrationText.trim() !== "" && stripped !== text;

  const insertTag = (tag: string) => {
    const base = narrationText.trim() === "" ? text : narrationText;
    setNarrationText(`[${tag}] ${base}`);
  };

  const save = async () => {
    setError(null);
    try {
      await updateSegment({
        segmentId: segment.id,
        text,
        narrationText: narrationText.trim() === "" ? null : narrationText,
      }).unwrap();
    } catch (e: any) {
      setError(e?.data?.message ?? "Could not save.");
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-2 w-5 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
          {index}
        </span>
        <div className="flex-1 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background p-2 text-xs leading-relaxed"
          />

          <div className="flex flex-wrap items-center gap-1">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
              >
                {tag}
              </button>
            ))}
          </div>

          <textarea
            value={narrationText}
            onChange={(e) => setNarrationText(e.target.value)}
            rows={2}
            placeholder="Performed version — same words, plus [tags]. Leave blank to read it plainly."
            className={`w-full rounded-lg border bg-background p-2 font-mono text-[11px] leading-relaxed ${
              mismatch ? "border-destructive" : "border-border"
            }`}
          />

          {mismatch ? (
            <p className="text-[10px] text-destructive">
              Tags may be added, but the words must stay the same — this will be
              refused.
            </p>
          ) : null}
          {error ? (
            <p className="text-[10px] text-destructive">{error}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              onClick={save}
              disabled={!dirty || mismatch || saving}
              size="sm"
              variant={dirty ? "default" : "outline"}
            >
              {saving ? "Saving…" : dirty ? "Save page" : <Check className="h-4 w-4" />}
            </Button>

            {segment.narrationUrl ? (
              <audio
                controls
                preload="none"
                crossOrigin="use-credentials"
                src={`${API_URL}${segment.narrationUrl}`}
                className="h-8 flex-1"
              />
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Not narrated yet
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
