/**
 * Clio's Spoken Phrase Map (Mobile)
 *
 * key -> spoken phrase(s).
 * Kept as a flat map, deliberately separate from playback implementation.
 * Phrase keys match the web client catalog for consistent Clio personality.
 */
export const PHRASES = {
  CORRECT: [
    'Excellent!',
    'Nice work!',
    'Great job!',
    'You got it!',
    'Spot on!',
    'Brilliant thinking!',
  ],
  INCORRECT: [
    "Let's try again.",
    'Not quite, give it another go.',
    'Close! Check your numbers and try again.',
    "Don't worry, you've got this. Try once more.",
  ],
  TAKE_A_HINT: [
    'Maybe, take a hint.',
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
    'Great job, lesson complete!',
    'Awesome work today! Look at all that XP!',
    'You finished the lesson! Fantastic effort!',
  ],
} as const;

export type PhraseKey = keyof typeof PHRASES;
