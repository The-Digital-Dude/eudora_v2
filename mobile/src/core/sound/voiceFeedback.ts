import * as Speech from 'expo-speech';

import { PHRASES, type PhraseKey } from './phrases';

/**
 * On-device TTS (`AVSpeechSynthesizer` on iOS, Android `TextToSpeech`) — no
 * API key, no network call. Duolingo's actual voice-line feedback uses real
 * voice-actor recordings; this is more robotic and less consistent across
 * platforms. Treat it as a placeholder for the feature/architecture, not
 * final audio quality — see the mobile plan's "Voice-line audio feedback"
 * entry for the upgrade path to static audio files behind this same call.
 *
 * Tuned for kids: a female system voice (queried at runtime — `expo-speech`
 * has no direct gender option, only a device-reported voice list), and a
 * slower-than-default rate for clarity. Pitch is left at the voice's own
 * default rather than nudged up — pitch doesn't reliably read as "female" on
 * top of an already-male default voice, it just sounds like a higher male
 * voice, so voice selection is the real lever here and pitch isn't touched.
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
  'zira', // Windows/Edge en-US — confirmed present in this dev environment
  'hazel', // Windows/Edge en-GB
  'eva', // Windows/Edge es-*
  'catherine', // Windows/Edge en-AU
];

// undefined = not resolved yet, null = resolved, no match found (use system
// default). Resolved once per process and reused — getAvailableVoicesAsync()
// queries the OS, not worth repeating on every playback.
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
    // Some platforms (web included) don't implement getAvailableVoicesAsync
    // reliably — fall back to the system default voice rather than throw.
    cachedVoiceId = null;
  }
  return cachedVoiceId ?? undefined;
}

// Fire-and-forget at module load so the lookup is already cached by the time
// a student answers their first question, instead of paying the lookup cost
// on the very first playback.
void resolveFemaleVoiceId();

export async function playVoiceLine(key: PhraseKey, opts: { interrupt?: boolean } = {}) {
  const { interrupt = true } = opts;
  const entry = PHRASES[key];
  const phrase = Array.isArray(entry) ? entry[Math.floor(Math.random() * entry.length)] : entry;
  const voice = await resolveFemaleVoiceId();
  if (interrupt) Speech.stop();
  Speech.speak(phrase, { language: 'en-US', voice, rate: 0.85 });
}

/**
 * Narrates arbitrary text rather than a fixed `PhraseKey` — for pre-readers
 * who can't yet read a card's prompt/content themselves. Same underlying
 * `Speech.speak` call as `playVoiceLine`; `Speech.speak` already accepts any
 * string, so this needed no new plumbing beyond a wrapper that doesn't force
 * callers through the enum-keyed phrase map. Not wired to auto-play — card
 * text (unlike the fixed phrases above) isn't guaranteed to be short or
 * always appropriate to speak aloud unprompted, so callers trigger it
 * explicitly (e.g. a "Listen" button). Rate is slower than `playVoiceLine`'s
 * — full sentences read aloud to a pre-reader benefit more from extra
 * clarity than short one-word feedback does.
 */
export async function playText(text: string, opts: { interrupt?: boolean } = {}) {
  const { interrupt = true } = opts;
  if (!text.trim()) return;
  const voice = await resolveFemaleVoiceId();
  if (interrupt) Speech.stop();
  Speech.speak(text, { language: 'en-US', voice, rate: 0.78 });
}
