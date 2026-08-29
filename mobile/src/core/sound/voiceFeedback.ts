import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { PHRASES, VOICE_LINES, type PhraseKey } from './phrases';

/**
 * Clio Voice Engine for Mobile
 *
 * Provides kid-tuned speech synthesis with female voice lookup, math normalization,
 * and interruption management.
 */

const FEMALE_VOICE_HINTS = [
  'aria', // Windows/Edge natural, soft
  'samantha', // iOS en-US default female
  'victoria', // iOS en-US
  'susan', // Android/Google TTS en-US (Neural2-ish)
  'kate', // iOS en-GB
  'serena', // iOS en-GB
  'moira', // iOS en-IE
  'karen', // iOS en-AU
  'tessa', // iOS en-ZA
  'zoe', // iOS en-US (newer)
  'zira', // Windows/Edge en-US
  'hazel', // Windows/Edge en-GB
  'female',
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

/** The pre-generated line currently playing, so `stopVoice` can halt it. */
let activePlayer: AudioPlayer | null = null;

export async function stopVoice() {
  if (activePlayer) {
    try {
      activePlayer.pause();
    } catch {
      // ignore
    }
    activePlayer = null;
  }
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
  const variants = PHRASES[key];
  // One index for both paths, so the audio and the spoken text agree.
  const index = Math.floor(Math.random() * variants.length);

  if (interrupt) await stopVoice();

  // Clio's own recorded voice, bundled by voice/generate-voice-lines.mjs, so
  // she sounds like one character rather than whatever voice each device
  // happens to ship. Empty until that script has been run with a key.
  const source = VOICE_LINES[key]?.[index];
  if (source !== undefined) {
    try {
      const player = createAudioPlayer(source);
      activePlayer = player;
      player.play();
      return;
    } catch {
      // Fall through to the synthesiser rather than going silent.
      activePlayer = null;
    }
  }

  const voice = await resolveFemaleVoiceId();
  Speech.speak(variants[index], {
    language: 'en-US',
    voice,
    rate: 1.0,
    pitch: 1.35,
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
    rate: 1.0,
    pitch: 1.32,
    onDone,
    onError: () => onDone?.(),
  });
}
