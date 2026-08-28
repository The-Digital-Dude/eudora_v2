#!/usr/bin/env node
/**
 * Generates Clio's voice lines from the canonical catalog, and the typed
 * copies both clients import.
 *
 * Run by hand, commit the output. Deliberately not part of CI or any app
 * build: it costs money per run, needs a key no client may ever hold, and its
 * output changes only when someone edits the catalog or the voice.
 *
 *   GEMINI_API_KEY=... node voice/generate-voice-lines.mjs
 *   node voice/generate-voice-lines.mjs --check     # drift check, no network
 *   node voice/generate-voice-lines.mjs --catalog-only
 *
 * Why the catalog is emitted rather than imported: client/ and mobile/ are
 * independent pnpm projects with no workspace linking them, so there is no
 * import path from one to the other. One authored source plus generated
 * copies, with `--check` failing on drift, buys the same guarantee without
 * restructuring three projects and their CI around a 40-line file.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CATALOG = join(HERE, 'clio-phrases.json');

const WEB_CATALOG_OUT = join(
  ROOT,
  'client/src/features/clio/sound/clioPhrases.generated.ts',
);
const MOBILE_CATALOG_OUT = join(
  ROOT,
  'mobile/src/core/sound/phrases.generated.ts',
);
const WEB_AUDIO_DIR = join(ROOT, 'client/public/clio-voice');
const MOBILE_AUDIO_DIR = join(ROOT, 'mobile/assets/voice');

// Not the 2.5 TTS preview: it rejects every request with "Model tried to
// generate text, but it should only be used for TTS", so this script could
// never have produced a single line.
const MODEL = 'gemini-3.1-flash-tts-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const CATALOG_ONLY = args.has('--catalog-only');

/** Stable, filesystem-safe id for one phrase variant. */
function variantId(key, index) {
  return `${key.toLowerCase().replace(/_/g, '-')}-${index + 1}`;
}

const BANNER = `// GENERATED FILE — DO NOT EDIT.
// Source: voice/clio-phrases.json
// Regenerate: node voice/generate-voice-lines.mjs
//
// Both clients used to keep their own hand-maintained copy of this catalog,
// and they had already drifted: web called the wrong-answer key TRY_AGAIN
// while mobile called it INCORRECT, and mobile carried two duplicate keys web
// did not have.
`;

function emitWebCatalog(phrases, ids) {
  const entries = Object.entries(phrases)
    .map(
      ([key, variants]) =>
        `  ${key}: [\n${variants.map((v) => `    ${JSON.stringify(v)},`).join('\n')}\n  ],`,
    )
    .join('\n');

  const audio = Object.entries(ids)
    .map(
      ([key, list]) =>
        `  ${key}: [${list.map((id) => `"/clio-voice/${id}.wav"`).join(', ')}],`,
    )
    .join('\n');

  return `${BANNER}
export const CLIO_PHRASES = {
${entries}
} as const;

export type ClioPhraseKey = keyof typeof CLIO_PHRASES;

/**
 * Pre-generated audio for each variant, served from /public. Index-aligned
 * with CLIO_PHRASES, so variant N of a key is voice line N. Empty until the
 * generator has been run with a key; playback falls back to browser TTS for
 * any file that 404s.
 */
export const CLIO_VOICE_LINES: Record<ClioPhraseKey, readonly string[]> = {
${audio}
};
`;
}

function emitMobileCatalog(phrases, ids) {
  const entries = Object.entries(phrases)
    .map(
      ([key, variants]) =>
        `  ${key}: [\n${variants.map((v) => `    ${JSON.stringify(v)},`).join('\n')}\n  ],`,
    )
    .join('\n');

  // React Native's bundler resolves require() at build time, so these must be
  // literal paths — a computed one would not be bundled.
  const audio = Object.entries(ids)
    .map(
      ([key, list]) =>
        `  ${key}: [${list
          .map((id) => `require('../../../assets/voice/${id}.wav')`)
          .join(', ')}],`,
    )
    .join('\n');

  return `${BANNER}
export const PHRASES = {
${entries}
} as const;

export type PhraseKey = keyof typeof PHRASES;

/**
 * Pre-generated audio, bundled. Index-aligned with PHRASES. Any key whose
 * list is empty falls back to expo-speech at playback time.
 */
export const VOICE_LINES: Record<PhraseKey, readonly number[]> = {
${audio}
};
`;
}

/** One Gemini TTS call. Returns raw PCM (24kHz, mono, s16le). */
async function synthesize(text, voice, styleDirection, apiKey) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${styleDirection}\n\n${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Gemini rejected "${text}": ${res.status} ${(await res.text()).slice(0, 300)}`,
    );
  }

  const json = await res.json();
  const b64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error(`No audio returned for "${text}"`);
  return Buffer.from(b64, 'base64');
}

/** Gemini returns headerless PCM; players need a RIFF wrapper. */
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const raw = JSON.parse(await readFile(CATALOG, 'utf8'));
  const phrases = raw.phrases;
  const { name: voice, styleDirection } = raw.voice;

  // Which variants already have audio on disk. The manifests must describe
  // what exists, so a catalog-only run does not promise files nobody generated.
  const existing = new Set(
    existsSync(WEB_AUDIO_DIR)
      ? (await readdir(WEB_AUDIO_DIR))
          .filter((f) => f.endsWith('.wav'))
          .map((f) => f.replace(/\.wav$/, ''))
      : [],
  );

  const apiKey = process.env.GEMINI_API_KEY;
  const willGenerate = !CHECK_ONLY && !CATALOG_ONLY && !!apiKey;

  if (!CHECK_ONLY && !CATALOG_ONLY && !apiKey) {
    console.error(
      'GEMINI_API_KEY is not set. Emitting catalogs only — no audio will be\n' +
        'generated, and both clients will keep falling back to platform TTS.\n' +
        'Re-run with the key set to produce Clio’s actual voice.\n',
    );
  }

  if (willGenerate) {
    await mkdir(WEB_AUDIO_DIR, { recursive: true });
    await mkdir(MOBILE_AUDIO_DIR, { recursive: true });

    for (const [key, variants] of Object.entries(phrases)) {
      for (const [i, text] of variants.entries()) {
        const id = variantId(key, i);
        process.stdout.write(`  ${id} … `);
        const wav = pcmToWav(
          await synthesize(text, voice, styleDirection, apiKey),
        );
        await writeFile(join(WEB_AUDIO_DIR, `${id}.wav`), wav);
        await writeFile(join(MOBILE_AUDIO_DIR, `${id}.wav`), wav);
        existing.add(id);
        console.log(`${(wav.length / 1024).toFixed(0)} KB`);
      }
    }
  }

  // Manifests list only variants whose audio is actually present.
  const ids = Object.fromEntries(
    Object.entries(phrases).map(([key, variants]) => [
      key,
      variants
        .map((_, i) => variantId(key, i))
        .filter((id) => existing.has(id)),
    ]),
  );

  const outputs = [
    [WEB_CATALOG_OUT, emitWebCatalog(phrases, ids)],
    [MOBILE_CATALOG_OUT, emitMobileCatalog(phrases, ids)],
  ];

  if (CHECK_ONLY) {
    let drifted = false;
    for (const [path, want] of outputs) {
      const have = existsSync(path) ? await readFile(path, 'utf8') : '';
      if (normalize(have) !== normalize(want)) {
        console.error(`DRIFT: ${path} does not match voice/clio-phrases.json`);
        drifted = true;
      }
    }
    if (drifted) {
      console.error('\nRun `node voice/generate-voice-lines.mjs` and commit.');
      process.exit(1);
    }
    console.log('Generated catalogs match voice/clio-phrases.json.');
    return;
  }

  for (const [path, contents] of outputs) {
    await writeFile(path, contents);
    console.log(`wrote ${path.replace(ROOT, '.')}`);
  }

  const total = Object.values(ids).reduce((n, l) => n + l.length, 0);
  const wanted = Object.values(phrases).reduce((n, l) => n + l.length, 0);
  console.log(
    `\n${total}/${wanted} variants have audio.` +
      (total < wanted ? ' The rest fall back to platform TTS.' : ''),
  );
}

/** Line-ending differences are not drift. */
function normalize(s) {
  return s.replace(/\r\n/g, '\n');
}

/** Unused today, kept so a future run can skip unchanged lines. */
export function textHash(text, voice, style) {
  return createHash('sha256').update(`${voice} ${style} ${text}`).digest('hex');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
