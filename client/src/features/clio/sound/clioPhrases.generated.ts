// GENERATED FILE — DO NOT EDIT.
// Source: voice/clio-phrases.json
// Regenerate: node voice/generate-voice-lines.mjs
//
// Both clients used to keep their own hand-maintained copy of this catalog,
// and they had already drifted: web called the wrong-answer key TRY_AGAIN
// while mobile called it INCORRECT, and mobile carried two duplicate keys web
// did not have.

export const CLIO_PHRASES = {
  CORRECT: [
    "Excellent!",
    "Nice work!",
    "Great job!",
    "You got it!",
    "Spot on!",
    "Brilliant thinking!",
  ],
  INCORRECT: [
    "Let's try again.",
    "Not quite, give it another go.",
    "Close! Check your numbers and try again.",
    "Don't worry, you've got this. Try once more.",
  ],
  TAKE_A_HINT: [
    "Maybe, take a hint.",
    "Here's a little clue to help.",
    "Listen carefully, let's look at this hint.",
    "Let's break it down together.",
  ],
  ANSWER_REVEALED: [
    "Here's how we solve it.",
    "Let's look at the answer together.",
    "Here's the full explanation.",
  ],
  GREETING: [
    "Hi, I'm Clio! Let's explore some maths together.",
    "Welcome back! Ready for today's challenge?",
  ],
  LESSON_COMPLETE: [
    "Great job, lesson complete!",
    "Awesome work today! Look at all that XP!",
    "You finished the lesson! Fantastic effort!",
  ],
} as const;

export type ClioPhraseKey = keyof typeof CLIO_PHRASES;

/**
 * Pre-generated audio for each variant, served from /public. Index-aligned
 * with CLIO_PHRASES, so variant N of a key is voice line N. Empty until the
 * generator has been run with a key; playback falls back to browser TTS for
 * any file that 404s.
 */
export const CLIO_VOICE_LINES: Record<ClioPhraseKey, readonly string[]> = {
  CORRECT: [],
  INCORRECT: [],
  TAKE_A_HINT: [],
  ANSWER_REVEALED: [],
  GREETING: [],
  LESSON_COMPLETE: [],
};
