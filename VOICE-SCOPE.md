# Clio's voice — scope

**Written:** 2026-08-23 · Covers web (`client/`) and mobile (`mobile/`)

---

## 0. Your question, answered directly

> *I have a Gemini API key, can I use cloud TTS?*

**Not the product you named — but yes, a better-suited one.**

- **Google Cloud Text-to-Speech** (`texttospeech.googleapis.com`) is a separate GCP product. It needs a GCP project with billing, the API enabled, and service-account credentials. **Your Gemini API key will not authenticate it.**
- **Gemini's own native TTS** (`generativelanguage.googleapis.com`) **does** work with the key you already have. Verified against the current docs:
  - Models: `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts`, `gemini-3.1-flash-tts-preview`
  - 30 named voices, 80+ languages, controllable pace/tone/accent via natural-language prompt
  - Output: base64 PCM → 24kHz mono WAV
  - **All three are Preview, not GA** — see §4, this shapes the architecture

So: you don't need Cloud TTS, and you don't need new credentials. You need the Gemini TTS models, used the right way — which is the part worth getting right.

---

## 1. The thing to get right, before any code

The obvious reading of "use cloud TTS" is: replace `Speech.speak()` with a network call. **That would be wrong on four counts**, and avoiding it is most of the value of this plan.

1. **Latency.** A round-trip before "Excellent!" plays. The snappy answer→feedback loop is what makes the lesson feel good; a 400ms gap kills it.
2. **Cost that scales with success.** Paying per playback, forever, for the same ~30 phrases.
3. **Offline.** Breaks entirely.
4. **The API key cannot go in the client.** `EXPO_PUBLIC_*` vars are inlined into the JS bundle — anyone who installs the app can extract them. Same exposure on web. This is non-negotiable: **the key stays server-side.**

**The right shape is two tiers:**

| Tier | What | How | Runtime cost |
|---|---|---|---|
| **1. Fixed catalog** (~30 phrases) | "Excellent!", "Not quite.", "Great job, lesson complete!" | Generate **at build time**, commit as static audio, ship in the bundle | **Zero.** No network, no key, works offline |
| **2. Dynamic narration** | Card prompts, hints — the `playText()` path | Generate **server-side on first request**, cache in S3 keyed by content hash | **Zero after first generation** per content item |

Tier 1 is the bulk of the voice experience and needs no API, no key, no network. Tier 2 is authored content that changes rarely, so a cache turns it into a one-time cost too.

**The recurring cost of this, done right, is approximately zero.** Done wrong (live calls) it becomes a line item that grows with usage.

---

## 2. What exists today

### Web — `client/src/features/clio/sound/` (4 files)
- `clioVoiceService.ts` — browser **Web Speech API** (`SpeechSynthesis`), mute state, procedural Web Audio chimes, voice-list subscription
- `clioPhrases.ts` — `CLIO_PHRASES` catalog, `CLIO_VOICE_CONFIG` (rate 0.88, pitch 1.15), and `normalizeMathForSpeech()`
- `useClioVoice.ts` — React hook
- `ClioVoicePicker.tsx` — lets the **user pick** from whatever voices their browser has
- Consumed by `app/learn/[lessonId]/page.tsx` and `app/about-eudora/components/clio-demo-section.tsx`

### Mobile — `mobile/src/core/sound/` (3 files)
- `voiceFeedback.ts` — **`expo-speech`** (on-device `AVSpeechSynthesizer`/Android TTS), with a female-voice-name heuristic
- `phrases.ts` — catalog, since synced to match web's keys
- `soundEffects.ts` — **`expo-audio`** playing static `.wav` files
- Consumed by `app/lesson/[lessonId].tsx`

### Two findings worth your attention

**1. Clio has no consistent voice — and that's the real problem here, more than quality.**

Right now Clio sounds like a different character on every device: whatever voices that browser or OS happens to have installed. Clio is a *character* with a mascot, a name, and a personality spec (`CLIO_MASCOT_SPEC.md`). Characters have **one voice**. The genuine win from cloud TTS isn't "less robotic" — it's that Clio finally sounds like Clio everywhere. That's a brand argument, and it's the one I'd actually spend money on.

Corollary: **`ClioVoicePicker` works against this.** Letting users reassign Clio's voice is the opposite of a consistent character. Recommend removing it and keeping only a mute toggle (§3, W-V3).

**2. Web defaults Clio to a Hindi voice.**

```ts
// clioVoiceService.ts
const DEFAULT_VOICE_HINTS = ["google हिन्दी", "google hindi", "hi-in", "hindi"];
```

Every phrase in the catalog is English. A Hindi-locale voice reading English text mispronounces it. If this was deliberate for a target market, the *phrases* need localising too, not just the voice. If it was left over from testing, it's a live defect on the learner-facing lesson screen. **Confirm which — I haven't assumed.**

*Minor:* mobile's `phrases.ts` carries duplicate pairs (`INCORRECT`/`TRY_AGAIN` identical; `TAKE_A_HINT`/`HINT_REVEALED` near-identical) left from syncing with web. Harmless, worth collapsing when the catalog moves to one source.

---

## 3. The work

### W-V1 — One catalog, pre-generated audio *(the bulk of the value)*

- **Single source of truth for phrases.** Today the catalog is duplicated across web and mobile and has already drifted once. One file, imported by both.
- **A build-time generation script.** Reads the catalog → calls `gemini-2.5-flash-preview-tts` once per phrase variant → writes audio files. Run manually, commit the output. Not part of CI, not part of the app.
- **Web playback:** swap `SpeechSynthesis` for `<audio>` against the static files.
- **Mobile playback:** swap `expo-speech` for `expo-audio` — **this is smaller than it sounds**, because `soundEffects.ts` already does exactly this with static `.wav`s. The pattern exists; it just needs pointing at voice lines.
- **Keep platform TTS as fallback** behind the same call, for any phrase whose file is missing. `voiceFeedback.ts`'s own comment already anticipates this swap ("the upgrade path to static audio files behind this same call") — the seam was designed for it.

*No API changes. No key in any client. No network at runtime.*

### W-V2 — Dynamic narration *(only if you want card/hint read-aloud)*

This is the `playText()` path — reading a card's prompt or hint to a pre-reader.

- **New API module.** `POST /tts/synthesize` (or `GET /tts/:hash`): hash the normalised text + voice config → check S3 via the existing `StorageProvider` → on miss, call Gemini, store, return a signed URL; on hit, return the URL.
- **`StorageProvider` already fits.** `uploadPrivateFile`/`getSignedUrl` exist and S3 is already the configured backend. No new storage work.
- **Clients** fetch the URL and play it, same as any audio.
- **New dependency + env:** `@google/genai` on the API service, `GEMINI_API_KEY` server-side only.
- **`normalizeMathForSpeech()` moves server-side** so the cache key is computed on the same normalised text both clients would have sent — otherwise the two platforms cache-miss against each other for identical content.

### W-V3 — Make Clio one character

- **Audition the 30 Gemini voices, pick one.** Document the choice next to `CLIO_MASCOT_SPEC.md` — it's a brand asset now, not a config value.
- **Remove `ClioVoicePicker`,** keep the mute toggle. (Accessibility note: a *speed* control is more defensible than a voice control if you want to keep a knob.)
- **Resolve the Hindi default** per §2.
- **Collapse the duplicate phrase keys.**

---

## 4. Risks and constraints, stated plainly

**All three TTS models are Preview, not GA.** Google can change or withdraw them. This is an argument *for* the pre-generation architecture and *against* runtime dependence: with W-V1 you own the audio files outright, so a model deprecation costs you a re-run of a script, not a broken app. W-V2 does take a live dependency — which is a further reason to keep it cached and optional.

**Rate limits and data policy — check, don't assume.** The public docs don't publish free-tier RPM/RPD for TTS; they point to AI Studio's rate-limit page for your account's actual numbers. Likewise, whether free-tier prompts are used to improve Google's products differs by tier and needs reading before you send real content through it. For a one-time catalog generation neither matters much; **for W-V2 sending authored course content, read the data-logging policy first.**

**Pricing** (current, verified): `2.5-flash-tts` $0.50/1M input, **$10/1M output**; `2.5-pro-tts` and `3.1-flash-tts` $1/$20. Batch is half. The fixed catalog is ~30 short phrases generated once — comfortably under a dollar, ever. W-V2 is one generation per card, cached forever after.

**What I have not verified:** actual audio quality of the Gemini voices for a kids' education tone, and how well they handle maths read aloud ("3/4" → "three quarters" vs "three slash four"). `normalizeMathForSpeech()` exists because browser TTS gets this wrong — **whether Gemini needs it too is an open question worth testing before committing.** Audition first, on real card text.

---

## 5. My recommendation

**Do W-V1 and W-V3. Hold W-V2 until someone asks for read-aloud.**

W-V1 + W-V3 gets you the actual prize — Clio sounding like one consistent character everywhere — for zero runtime cost, zero key exposure, zero offline risk, and no API work at all. It's mostly a swap behind seams that were deliberately built for it.

W-V2 is where the complexity, the live dependency on a Preview model, the data-policy question, and the caching correctness all live, and it buys a narrower feature (pre-reader narration). Worth doing — but worth doing *second*, and worth being asked for first.

**Before any of it: audition the voices and settle the Hindi question.** Both are decisions, not implementation, and both change what gets built.
