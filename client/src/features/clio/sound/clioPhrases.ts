/**
 * Clio's Voice Phrase Catalog and Speech Utilities
 *
 * Designed for Clio, the friendly female AI math companion.
 * All phrases are kid-friendly, encouraging, and pedagogically sound.
 */

import {
  CLIO_PHRASES,
  type ClioPhraseKey,
} from "./clioPhrases.generated";

// The catalog itself is generated from voice/clio-phrases.json, the single
// source both clients are built from. This module keeps the web-only speech
// config and helpers around it.
export {
  CLIO_PHRASES,
  CLIO_SPOKEN_LINES,
  CLIO_VOICE_LINES,
  type ClioPhraseKey,
} from "./clioPhrases.generated";

export interface ClioVoiceConfig {
  rate: number; // Normal speaking speed; 1.0 is the platform default.
  pitch: number; // Tone pitch — matches mobile's tuned playVoiceLine() value
  preferredVoiceHints: string[];
}

// Kept in step with mobile's playVoiceLine() tuning so Clio sounds like the
// same character on both platforms, not two different voices.
export const CLIO_VOICE_CONFIG: ClioVoiceConfig = {
  rate: 1.0,
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
