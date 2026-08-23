import * as Speech from 'expo-speech';

import { PHRASES, type PhraseKey } from './phrases';

/**
 * Clio Voice Engine for Mobile
 *
 * Provides kid-tuned speech synthesis with female voice lookup, math normalization,
 * and interruption management.
 */

const FEMALE_VOICE_HINTS = [
  'female',
  'samantha', // iOS en-US default female
  'victoria', // iOS en-US
  'kate', // iOS en-GB
  'serena', // iOS en-GB
  'moira', // iOS en-IE
  'karen', // iOS en-AU
  'tessa', // iOS en-ZA
  'zoe', // iOS en-US (newer)
  'susan', // Android/Google TTS en-US
  'zira', // Windows/Edge en-US
  'hazel', // Windows/Edge en-GB
  'eva', // Windows/Edge es-*
  'catherine', // Windows/Edge en-AU
];

let cachedVoiceId: string | null | undefined;

async function resolveFemaleVoiceId(): Promise<string | undefined> {
  if (cachedVoiceId !== undefined) return cachedVoiceId ?? undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const match = voices.find((v) => {
      const haystack = `${v.identifier} ${v.name}`.toLowerCase();
      return FEMALE_VOICE_HINTS.some((hint) => haystack.includes(hint));
    });
    cachedVoiceId = match?.identifier ?? null;
  } catch {
    cachedVoiceId = null;
  }
  return cachedVoiceId ?? undefined;
}

// Warm up lookup at startup
void resolveFemaleVoiceId();

/**
 * Normalizes math expressions for speech clarity
 */
export function normalizeMathForMobileSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\times/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\pm/g, ' plus or minus ')
    .replace(/\\approx/g, ' approximately ')
    .replace(/\\neq/g, ' is not equal to ')
    .replace(/\\le/g, ' is less than or equal to ')
    .replace(/\\ge/g, ' is greater than or equal to ')
    .replace(/\$/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/≠/g, ' is not equal to ')
    .replace(/≤/g, ' is less than or equal to ')
    .replace(/≥/g, ' is greater than or equal to ')
    .replace(/=/g, ' equals ')
    .replace(/%/g, ' percent ')
    .replace(/\+/g, ' plus ')
    .replace(/−/g, ' minus ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function stopVoice() {
  try {
    await Speech.stop();
  } catch {
    // ignore
  }
}

export async function isSpeakingAsync(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

export async function playVoiceLine(key: PhraseKey, opts: { interrupt?: boolean } = {}) {
  const { interrupt = true } = opts;
  const entry = PHRASES[key];
  const phrase = Array.isArray(entry) ? entry[Math.floor(Math.random() * entry.length)] : entry;
  const voice = await resolveFemaleVoiceId();
  if (interrupt) await stopVoice();
  Speech.speak(phrase, {
    language: 'en-US',
    voice,
    rate: 0.86,
    pitch: 1.15,
  });
}

/**
 * Narrates arbitrary question/hint/explanation text
 */
export async function playText(text: string, opts: { interrupt?: boolean; onDone?: () => void } = {}) {
  const { interrupt = true, onDone } = opts;
  const clean = normalizeMathForMobileSpeech(text);
  if (!clean) return;

  const voice = await resolveFemaleVoiceId();
  if (interrupt) await stopVoice();

  Speech.speak(clean, {
    language: 'en-US',
    voice,
    rate: 0.82,
    pitch: 1.12,
    onDone,
    onError: () => onDone?.(),
  });
}
