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
