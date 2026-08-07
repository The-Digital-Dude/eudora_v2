import * as Speech from 'expo-speech';

import { PHRASES, type PhraseKey } from './phrases';

/**
 * On-device TTS (`AVSpeechSynthesizer` on iOS, Android `TextToSpeech`) — no
 * API key, no network call. Duolingo's actual voice-line feedback uses real
 * voice-actor recordings; this is more robotic and less consistent across
 * platforms. Treat it as a placeholder for the feature/architecture, not
 * final audio quality — see the mobile plan's "Voice-line audio feedback"
 * entry for the upgrade path to static audio files behind this same call.
 */
export function playVoiceLine(key: PhraseKey, opts: { interrupt?: boolean } = {}) {
  const { interrupt = true } = opts;
  const entry = PHRASES[key];
  const phrase = Array.isArray(entry) ? entry[Math.floor(Math.random() * entry.length)] : entry;
  if (interrupt) Speech.stop();
  Speech.speak(phrase, { rate: 0.95 });
}

/**
 * Narrates arbitrary text rather than a fixed `PhraseKey` — for pre-readers
 * who can't yet read a card's prompt/content themselves. Same underlying
 * `Speech.speak` call as `playVoiceLine`; `Speech.speak` already accepts any
 * string, so this needed no new plumbing beyond a wrapper that doesn't force
 * callers through the enum-keyed phrase map. Not wired to auto-play — card
 * text (unlike the fixed phrases above) isn't guaranteed to be short or
 * always appropriate to speak aloud unprompted, so callers trigger it
 * explicitly (e.g. a "Listen" button).
 */
export function playText(text: string, opts: { interrupt?: boolean } = {}) {
  const { interrupt = true } = opts;
  if (!text.trim()) return;
  if (interrupt) Speech.stop();
  Speech.speak(text, { rate: 0.9 });
}
