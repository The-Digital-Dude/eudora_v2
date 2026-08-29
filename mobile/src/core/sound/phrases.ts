/**
 * Clio's Spoken Phrase Map (Mobile)
 *
 * Re-exported from the generated copy of voice/clio-phrases.json — the single
 * source both clients are built from. Web and mobile each used to keep a
 * hand-maintained catalog, and they had already drifted: the wrong-answer key
 * was INCORRECT here and TRY_AGAIN on web, and this file carried two duplicate
 * keys web did not have. INCORRECT won, since it pairs with CORRECT.
 *
 * Edit voice/clio-phrases.json and re-run voice/generate-voice-lines.mjs.
 */
export { PHRASES, VOICE_LINES, type PhraseKey } from './phrases.generated';
