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
  CORRECT: ["/clio-voice/correct-1.mp3", "/clio-voice/correct-2.mp3", "/clio-voice/correct-3.mp3", "/clio-voice/correct-4.mp3", "/clio-voice/correct-5.mp3", "/clio-voice/correct-6.mp3"],
  INCORRECT: ["/clio-voice/incorrect-1.mp3", "/clio-voice/incorrect-2.mp3", "/clio-voice/incorrect-3.mp3", "/clio-voice/incorrect-4.mp3"],
  TAKE_A_HINT: ["/clio-voice/take-a-hint-1.mp3", "/clio-voice/take-a-hint-2.mp3", "/clio-voice/take-a-hint-3.mp3", "/clio-voice/take-a-hint-4.mp3"],
  ANSWER_REVEALED: ["/clio-voice/answer-revealed-1.mp3", "/clio-voice/answer-revealed-2.mp3", "/clio-voice/answer-revealed-3.mp3"],
  GREETING: ["/clio-voice/greeting-1.mp3", "/clio-voice/greeting-2.mp3"],
  LESSON_COMPLETE: ["/clio-voice/lesson-complete-1.mp3", "/clio-voice/lesson-complete-2.mp3", "/clio-voice/lesson-complete-3.mp3"],
};

/**
 * Whole lines with their own recording, keyed by the exact text spoken.
 * Consulted before falling back to the browser synthesiser, so a scripted
 * lesson sounds like Clio rather than like the device.
 */
export const CLIO_SPOKEN_LINES: Record<string, string> = {
  "Let's show a fraction by colouring in part of a shape.": "/clio-voice/line-8d178f8560dd.mp3",
  "Hi, I'm Clio. Percent just means 'out of a hundred', so let's look at one.": "/clio-voice/line-07ba3a2a4919.mp3",
  "Grids are just directions. Across first, then up.": "/clio-voice/line-432247408112.mp3",
  "Same idea as the shaded shape, written a different way.": "/clio-voice/line-373bb6da27aa.mp3",
  "Last one, and this time there's nothing to pick from.": "/clio-voice/line-d2a141fcc57a.mp3",
  "Shade two of the six slices, so two sixths of the circle is coloured in.": "/clio-voice/line-1686f9fb592a.mp3",
  "Move the slider to show what percentage of this shape is shaded.": "/clio-voice/line-8b32758da246.mp3",
  "Clio buried her treasure 2 steps across and 4 steps up. Click that spot on the grid.": "/clio-voice/line-65e9864b2b46.mp3",
  "Maya cuts a pizza into 4 equal slices and eats 1 slice. Which fraction shows how much she ate?": "/clio-voice/line-20fadc38f35f.mp3",
  "Slide to show how many legs 3 dogs have altogether.": "/clio-voice/line-6f3a1fa2e6ce.mp3",
  "There are six equal slices in the circle. You only need to colour two of them in.": "/clio-voice/line-1a5c4cef778d.mp3",
  "The shape has 10 equal squares, so one square is one tenth, and one tenth is 10%.": "/clio-voice/line-9fd7ecce6568.mp3",
  "Walk along the bottom line first and stop at 2. Only then start climbing.": "/clio-voice/line-0346a9de3490.mp3",
  "Start with the bottom number. It's how many equal slices the whole pizza was cut into.": "/clio-voice/line-b85d9e1177da.mp3",
  "One dog has 4 legs. Try counting up by 4, three times.": "/clio-voice/line-3b2b062447ff.mp3",
  "Two of the six equal slices are shaded, so the shape shows two sixths — that's 2/6 of the circle.": "/clio-voice/line-597e61f0876f.mp3",
  "10 equal squares means each one is worth 10%. Three of them are shaded, so 3 × 10% = 30%.": "/clio-voice/line-c2b5575c9c53.mp3",
  "Across before up, every time. 2 along the bottom and 4 up from there is the point (2, 4).": "/clio-voice/line-48d105f6ca8b.mp3",
  "The bottom number counts the equal pieces in the whole (4 slices). The top counts how many were taken (1 slice). So Maya ate 1/4 of the pizza.": "/clio-voice/line-ebe285ca9777.mp3",
  "3 groups of 4 legs is 4 + 4 + 4, which is 12. That's what 3 × 4 means.": "/clio-voice/line-af599840ba47.mp3",
};
