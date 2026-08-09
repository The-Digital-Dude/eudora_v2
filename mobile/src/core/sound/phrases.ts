/**
 * key -> spoken phrase(s). Kept as a flat map, deliberately separate from the
 * playback implementation (`voiceFeedback.ts`) — swapping on-device TTS for
 * static recorded/cloud-TTS audio files later only changes what's behind
 * `playVoiceLine(key)`, not this map or its call sites.
 *
 * CORRECT/INCORRECT are arrays — `playVoiceLine` picks one at random per
 * call so a lesson doesn't repeat the identical line on every card. The rest
 * stay single strings since they each fire at most once per lesson.
 */
export const PHRASES = {
  CORRECT: ['Excellent!', 'Nice work!', 'Great job!'],
  INCORRECT: ['Try again.', 'Not quite.', 'Close, but not correct.'],
  ANSWER_REVEALED: "Here's the answer.",
  HINT_REVEALED: 'Listen carefully.',
  LESSON_COMPLETE: 'Great job, lesson complete!',
} as const;

export type PhraseKey = keyof typeof PHRASES;
