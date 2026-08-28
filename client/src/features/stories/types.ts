import type { Timings } from "./narration-timings";

/**
 * The story payload, identical whether it came from the authenticated route or
 * the public demo. Media URLs arrive relative and already pointing at the right
 * route family — the server decides which, so the reader never has to know
 * which surface it is running on.
 */
export interface StoryAsset {
  id: string;
  url: string;
  altText: string;
}

export interface StorySegment {
  id: string;
  text: string;
  narrationUrl: string | null;
  narrationDurationMs: number | null;
  narrationTimings: Timings | null;
  assets: StoryAsset[];
}

export interface StoryChapter {
  id: string;
  title: string | null;
  segments: StorySegment[];
}

export interface Story {
  id: string;
  title: string;
  synopsis: string | null;
  cover: StoryAsset | null;
  chapters: StoryChapter[];
  characters: { id: string; name: string; description: string | null }[];
}

/** What comes back from a question. */
export interface AgentReply {
  conversationId: string;
  /** What we heard, so the child can see their own words. */
  childText: string;
  replyText: string;
  /** Base64; spoken once and not stored, so it rides in the response. */
  replyAudio: string | null;
  replyAudioMimeType: string | null;
  /** Null for a signed-in child — only the public demo is capped. */
  turnsRemaining: number | null;
}

/** Everything a question needs, minus who is asking — the caller supplies that. */
export interface AskPayload {
  text?: string;
  audio?: string;
  audioMimeType?: string;
  conversationId?: string;
  segmentId?: string;
  speak?: boolean;
}
