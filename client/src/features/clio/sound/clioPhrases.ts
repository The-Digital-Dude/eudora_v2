/**
 * Clio's Voice Phrase Catalog and Speech Utilities
 *
 * Designed for Clio, the friendly female AI math companion.
 * All phrases are kid-friendly, encouraging, and pedagogically sound.
 */

export const CLIO_PHRASES = {
  CORRECT: [
    "Excellent!",
    "Nice work!",
    "Great job!",
    "You got it!",
    "Spot on!",
    "Brilliant thinking!",
  ],
  TRY_AGAIN: [
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

export interface ClioVoiceConfig {
  rate: number; // Speed of speech — matches mobile's tuned playVoiceLine() value
  pitch: number; // Tone pitch — matches mobile's tuned playVoiceLine() value
  preferredVoiceHints: string[];
}

// Synced to mobile's voiceFeedback.ts playVoiceLine() tuning so Clio sounds
// like the same character on both platforms, not two different voices.
export const CLIO_VOICE_CONFIG: ClioVoiceConfig = {
  rate: 0.68,
  pitch: 1.35,
  preferredVoiceHints: [
    "google us english",
    "journey-f",
    "neural2-f",
    "samantha",
    "victoria",
    "jenny",
    "aria",
    "zira",
    "karen",
    "serena",
    "moira",
    "female",
  ],
};

/**
 * Normalizes math expressions in prompts and hints so TTS reads them naturally.
 * e.g. "3 × 10% = 30%" -> "3 times 10 percent equals 30 percent"
 * e.g. "(3, 4)" -> "coordinates 3 comma 4"
 */
export function normalizeMathForSpeech(text: string): string {
  if (!text) return "";

  return text
    // Replace markdown or latex formatting
    .replace(/\\times/g, " times ")
    .replace(/\\div/g, " divided by ")
    .replace(/\\pm/g, " plus or minus ")
    .replace(/\\approx/g, " approximately ")
    .replace(/\\neq/g, " is not equal to ")
    .replace(/\\le/g, " is less than or equal to ")
    .replace(/\\ge/g, " is greater than or equal to ")
    .replace(/\$/g, "") // strip latex dollar signs
    .replace(/\*\*(.*?)\*\*/g, "$1") // strip bold
    .replace(/\*(.*?)\*/g, "$1") // strip italic
    // Common math symbols
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/≠/g, " is not equal to ")
    .replace(/≤/g, " is less than or equal to ")
    .replace(/≥/g, " is greater than or equal to ")
    .replace(/=/g, " equals ")
    .replace(/%/g, " percent ")
    .replace(/\+/g, " plus ")
    .replace(/−/g, " minus ")
    // Clean up multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pick a random phrase for a key
 */
export function getRandomClioPhrase(key: ClioPhraseKey): string {
  const entry = CLIO_PHRASES[key];
  const list = entry as readonly string[];
  return list[Math.floor(Math.random() * list.length)] || "";
}
