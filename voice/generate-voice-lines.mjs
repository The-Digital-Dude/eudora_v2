#!/usr/bin/env node
/**
 * Generates Clio's voice lines from the canonical catalog, and the typed
 * copies both clients import.
 *
 * Run by hand, commit the output. Deliberately not part of CI or any app
 * build: it costs money per run, needs a key no client may ever hold, and its
 * output changes only when someone edits the catalog or the voice.
 *
 *   ELEVEN_LABS_API_KEY=... node voice/generate-voice-lines.mjs
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
const DEMO_LESSON = join(
  ROOT,
  'client/src/app/about-eudora/components/demo-lesson.ts',
);

const API_ROOT = 'https://api.elevenlabs.io/v1';

// Constant-bitrate MP3 rather than WAV. These files ship to every visitor of
// the marketing page, and a WAV of a one-second line is roughly ten times the
// bytes for no audible gain.
const OUTPUT_FORMAT = 'mp3_44100_128';

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const CATALOG_ONLY = args.has('--catalog-only');

/** Stable, filesystem-safe id for one phrase variant. */
function variantId(key, index) {
  return `${key.toLowerCase().replace(/_/g, '-')}-${index + 1}`;
}

/**
 * Id for a whole spoken line, derived from the text itself.
 *
 * Content-addressed on purpose: editing a line in the catalog changes its id,
 * so the old audio is simply never looked up again. The alternative — a
 * positional id — would keep playing the previous recording of a line someone
 * had rewritten, which is the failure nobody notices.
 */
function lineId(text) {
  return `line-${createHash('sha1').update(text).digest('hex').slice(0, 12)}`;
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

function emitWebCatalog(phrases, ids, spokenLines) {
  const entries = Object.entries(phrases)
    .map(
      ([key, variants]) =>
        `  ${key}: [\n${variants.map((v) => `    ${JSON.stringify(v)},`).join('\n')}\n  ],`,
    )
    .join('\n');

  const audio = Object.entries(ids)
    .map(
      ([key, list]) =>
        `  ${key}: [${list.map((id) => `"/clio-voice/${id}.mp3"`).join(', ')}],`,
    )
    .join('\n');

  const spoken = spokenLines
    .map((t) => `  ${JSON.stringify(t)}: "/clio-voice/${lineId(t)}.mp3",`)
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

/**
 * Whole lines with their own recording, keyed by the exact text spoken.
 * Consulted before falling back to the browser synthesiser, so a scripted
 * lesson sounds like Clio rather than like the device.
 */
export const CLIO_SPOKEN_LINES: Record<string, string> = {
${spoken}
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
          .map((id) => `require('../../../assets/voice/${id}.mp3')`)
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

/**
 * One ElevenLabs call. Returns a finished MP3.
 *
 * The delivery direction rides in the text as `[tags]`, which is why the model
 * has to be eleven_v3 — the turbo models read the bracketed words out loud
 * instead of performing them.
 */
async function synthesize(text, voiceId, modelId, apiKey) {
  const res = await fetch(
    `${API_ROOT}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      // JSON.stringify encodes as UTF-8; hand-built payloads are what make the
      // API reject curly quotes and dashes as invalid_unicode.
      body: JSON.stringify({ text, model_id: modelId }),
    },
  );

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    const hint =
      res.status === 402
        ? ' — that voice needs a paid plan; pick a premade one'
        : '';
    throw new Error(
      `ElevenLabs rejected "${text}": ${res.status}${hint} ${detail}`,
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const raw = JSON.parse(await readFile(CATALOG, 'utf8'));
  const phrases = raw.phrases;
  const { voiceId, modelId } = raw.voice;
  const spokenLines = raw.spokenLines?.lines ?? [];

  // Which variants already have audio on disk. The manifests must describe
  // what exists, so a catalog-only run does not promise files nobody generated.
  const existing = new Set(
    existsSync(WEB_AUDIO_DIR)
      ? (await readdir(WEB_AUDIO_DIR))
          .filter((f) => f.endsWith('.mp3'))
          .map((f) => f.replace(/\.mp3$/, ''))
      : [],
  );

  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  const willGenerate = !CHECK_ONLY && !CATALOG_ONLY && !!apiKey;

  if (!CHECK_ONLY && !CATALOG_ONLY && !apiKey) {
    console.error(
      'ELEVEN_LABS_API_KEY is not set. Emitting catalogs only — no audio will\n' +
        'be generated, and both clients will keep falling back to platform TTS.\n' +
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
        const mp3 = await synthesize(text, voiceId, modelId, apiKey);
        await writeFile(join(WEB_AUDIO_DIR, `${id}.mp3`), mp3);
        await writeFile(join(MOBILE_AUDIO_DIR, `${id}.mp3`), mp3);
        existing.add(id);
        console.log(`${(mp3.length / 1024).toFixed(0)} KB`);
      }
    }

    // Whole lines. Only web gets these: they are the scripted marketing demo,
    // and bundling them into the mobile app would ship megabytes nobody there
    // ever plays.
    for (const text of spokenLines) {
      const id = lineId(text);
      if (existing.has(id)) continue;
      process.stdout.write(`  ${id} … `);
      const mp3 = await synthesize(text, voiceId, modelId, apiKey);
      await writeFile(join(WEB_AUDIO_DIR, `${id}.mp3`), mp3);
      existing.add(id);
      console.log(`${(mp3.length / 1024).toFixed(0)} KB`);
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
    [WEB_CATALOG_OUT, emitWebCatalog(phrases, ids, spokenLines)],
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
    if (await checkDemoCoverage(spokenLines, existing)) {
      drifted = true;
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

/**
 * Every word the marketing demo speaks must have a recording.
 *
 * The demo is fully scripted, so there is no excuse for any of it reaching the
 * device synthesiser — and when it does, nothing breaks. It just quietly
 * changes voice mid-lesson, which is how the "Listen" buttons spent their
 * whole life reading in Chrome's voice while the feedback lines used Clio's.
 *
 * Compared as sets in both directions rather than as a coverage count: a
 * one-way check passes when the scrape below matches nothing at all, which is
 * the failure that would let this rot again.
 */
async function checkDemoCoverage(spokenLines, existing) {
  if (!existsSync(DEMO_LESSON)) return false;
  const src = await readFile(DEMO_LESSON, 'utf8');

  const spoken = new Set();
  for (const field of ['clioIntro', 'prompt', 'hint', 'explanation']) {
    const re = new RegExp(`^\\s*${field}:\\s*("(?:[^"\\\\]|\\\\.)*")`, 'gm');
    for (const m of src.matchAll(re)) spoken.add(JSON.parse(m[1]));
  }

  const catalog = new Set(spokenLines);
  const uncatalogued = [...spoken].filter((t) => !catalog.has(t));
  const unused = [...catalog].filter((t) => !spoken.has(t));
  const silent = [...spoken].filter(
    (t) => catalog.has(t) && !existing.has(lineId(t)),
  );

  let failed = false;
  for (const t of uncatalogued) {
    console.error(`NOT IN CATALOG: ${JSON.stringify(t.slice(0, 60))}`);
    failed = true;
  }
  for (const t of silent) {
    console.error(`NO AUDIO FILE:  ${JSON.stringify(t.slice(0, 60))}`);
    failed = true;
  }
  for (const t of unused) {
    console.error(`NOT IN DEMO:    ${JSON.stringify(t.slice(0, 60))}`);
    failed = true;
  }

  if (failed) {
    console.error(
      '\nThe demo speaks lines with no recording, or the catalog carries lines\n' +
        'the demo no longer says. Both mean somebody edited the copy without\n' +
        'running this generator. Update voice/clio-phrases.json to match\n' +
        'demo-lesson.ts and re-run with a key.',
    );
    return true;
  }
  console.log(`All ${spoken.size} demo lines have recordings.`);
  return false;
}

/** Unused today, kept so a future run can skip unchanged lines. */
export function textHash(text, voice, style) {
  return createHash('sha256').update(`${voice} ${style} ${text}`).digest('hex');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
