# Tune Clio's Voice: Childish, Soft, Slow (On-Device)

## Context
Clio's spoken feedback currently sounds robotic. Both platforms rely on **device OS voices** (not cloud TTS), so timbre depends on what's installed. Current settings:

- **Web** (`client/src/features/clio/sound/clioPhrases.ts` → `CLIO_VOICE_CONFIG`): `rate: 0.88`, `pitch: 1.15`, `volume: 1`. Engine = browser Web Speech API (`clioVoiceService.ts`).
- **Mobile** (`mobile/src/core/sound/voiceFeedback.ts`): `playVoiceLine` `rate: 0.86 / pitch: 1.15`; `playText` `rate: 0.82 / pitch: 1.12`. Engine = `expo-speech`.
- `client/src/app/api/tts/route.ts` (Google Cloud TTS, `en-US-Journey-F`) exists but is **unused** and has **no API key configured** → out of scope (kept as a future fallback only).

Goal: make Clio sound **child-like (higher pitch), soft (gentle/lower-volume natural voices), and slow (lower rate)** using only free on-device synthesis.

## Plan

### 1. Web client — voice config
File: `client/src/features/clio/sound/clioPhrases.ts`
- Lower `rate` 0.88 → **0.78** (slower, clearer for kids).
- Raise `pitch` 1.15 → **1.35** (child-like; keep < 1.5 to avoid harsh chipmunk timbre).
- Reorder `preferredVoiceHints` to prioritize **natural/neural/young, softer** voices first, so the selector picks the least robotic available voice:
  `["aria", "jenny", "google us english", "samantha", "victoria", "karen", "moira", "susan", "neural2-f", "journey-f", "zira", "female"]`
  (rationale: "Microsoft Aria Online (Natural)" / "Jenny" on Win11, "Google US English" = Neural2 on Chrome, "Samantha"/"Victoria" on macOS are far softer than default Zira/David).
- Keep existing fallback chain (en-US → any en → voices[0]) in `clioVoiceService.getBestVoice()`.

File: `client/src/features/clio/sound/clioVoiceService.ts`
- In `speakText`, set `utterance.volume = 0.9` (was `1`) for a softer delivery.
- Optionally log the resolved voice name once when debugging (`console.debug("Clio voice:", voice?.name)`) to verify a good voice is selected during QA.

### 2. Mobile app — expo-speech params
File: `mobile/src/core/sound/voiceFeedback.ts`
- `playVoiceLine`: `rate` 0.86 → **0.68**, `pitch` 1.15 → **1.35**.
- `playText`: `rate` 0.82 → **0.66**, `pitch` 1.12 → **1.32**.
- Reorder `FEMALE_VOICE_HINTS` to lead with softer/natural voices:
  `["aria", "samantha", "victoria", "susan", "kate", "serena", "moira", "karen", "tessa", "zoe", "zira", "hazel", "female"]`
  (note: expo-speech `rate` scale differs by OS — 0.66–0.68 is "slower than normal" on both iOS (0–1) and Android (0.5–2); do not go below ~0.5 to avoid Android clamping).

### 3. (Optional, low priority) Phrase softening
Soften wording in `CLIO_PHRASES` (`clioPhrases.ts`) and `PHRASES` (`mobile/src/core/sound/phrases.ts`) toward shorter, gentler lines (e.g. add trailing "Okay?", "Let's see…"). Leave as optional polish; not required for the robotic fix.

## Out of scope
- Wiring up `/api/tts` (cloud TTS) — deferred unless a `GOOGLE_TTS_API_KEY`/`GEMINI_API_KEY` is added later.
- The Web Audio celebration chimes (`playWebAudioChime`) — already soft; unchanged.

## Risks / notes
- On-device quality is device-dependent: a chosen "soft" voice may be absent on some OSes, falling back to a more robotic one. Mitigated by the prioritized hint list + natural-voice matches.
- Too-high pitch (>1.5) or too-low rate (<0.6) can itself sound unnatural/robotic — stay within the values above.
- Android `expo-speech` rate far below 0.5 may be ignored; 0.66 is safe.

## Validation
1. **Web**: run `client` dev server; on Chrome, Edge, and Safari trigger CORRECT / TRY_AGAIN / TAKE_A_HINT / GREETING via the lesson page and `about-eudora` demo. Confirm: slower pace, higher child-like pitch, gentler volume; verify resolved voice name in console is a natural/neural voice (not default David/Zira).
2. **Mobile**: run Expo dev on iOS Simulator + Android Emulator; trigger the same phrase keys in `lesson/[lessonId].tsx`. Confirm slower/child-like/soft delivery on both platforms.
3. Regression: confirm mute toggle (`useClioVoice.toggleMute`) and interruption (`interrupt`) still behave; chimes still play.
