/**
 * Emotion tags live in the text sent to the speech provider, not in the text a
 * child reads.
 *
 * `eleven_v3` performs inline tags — `[whispers]`, `[excited]` — but the
 * character alignment it returns is computed over the string it was given, tags
 * and all. Highlighting straight from that alignment would print "[excited]" on
 * the page and light it up word by word. So the tagged string is stripped back
 * to the display text, and the alignment is remapped onto it.
 *
 * The mapping is exact rather than approximate: stripping must reproduce the
 * segment's own text character for character, and narration is refused if it
 * does not. That makes "the highlight matches the words" a property the data
 * guarantees, instead of something that happens to hold until an author writes
 * a story containing a bracket.
 */

export interface StrippedNarration {
  /** What the child sees — must equal the segment's text. */
  display: string;
  /**
   * For each character of the tagged input, its index in `display`, or -1 when
   * it was dropped as tag markup.
   */
  indexMap: number[];
}

/**
 * Removes `[tag]` markup, along with a single run of whitespace immediately
 * following it. Without swallowing that space, "[excited] She ran" would strip
 * to " She ran" and never match the author's "She ran".
 *
 * A tag written flush against the words on both sides leaves a space behind in
 * its place. `gasped.[amazed] As` plainly means `gasped. As`, but removing the
 * tag and its trailing space would give `gasped.As` and be refused — over a
 * whitespace convention nobody was told about. This only ever accepts pairs
 * that used to be rejected: where the author already put a space before the
 * tag, the character before the tag is whitespace and nothing is inserted.
 *
 * The inserted space has no character behind it in the tagged string, so it
 * gets no `indexMap` entry. `remapTimings` carries the previous end time across
 * such gaps, which is right — a space is not spoken.
 */
export function stripNarrationTags(tagged: string): StrippedNarration {
  const indexMap: number[] = new Array(tagged.length).fill(-1);
  let display = '';
  let i = 0;

  while (i < tagged.length) {
    if (tagged[i] === '[') {
      const close = tagged.indexOf(']', i);
      // An unclosed bracket is not markup — treat it as ordinary text so a
      // stray character cannot silently swallow the rest of the story.
      if (close === -1) {
        indexMap[i] = display.length;
        display += tagged[i];
        i++;
        continue;
      }
      i = close + 1;
      while (i < tagged.length && /\s/.test(tagged[i])) i++;

      const joinsTwoWords =
        display.length > 0 &&
        !/\s/.test(display[display.length - 1]) &&
        i < tagged.length &&
        !/\s/.test(tagged[i]);
      if (joinsTwoWords) display += ' ';
      continue;
    }
    indexMap[i] = display.length;
    display += tagged[i];
    i++;
  }

  return { display, indexMap };
}

/** True when `tagged` is `text` with only emotion markup added. */
export function narrationMatchesText(tagged: string, text: string): boolean {
  return stripNarrationTags(tagged).display === text;
}

export interface ProviderTimings {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/**
 * Rewrites timings measured against the tagged string so they index the display
 * text instead.
 *
 * Where several tagged characters collapse onto one display character — they
 * cannot, given the mapping above, but the loop does not assume it — the last
 * one wins, which keeps end times monotonic.
 */
export function remapTimings(
  timings: ProviderTimings,
  indexMap: number[],
  displayLength: number,
): ProviderTimings {
  const characters: string[] = new Array(displayLength).fill('');
  const starts: number[] = new Array(displayLength).fill(0);
  const ends: number[] = new Array(displayLength).fill(0);

  for (let i = 0; i < indexMap.length; i++) {
    const target = indexMap[i];
    if (target < 0 || target >= displayLength) continue;
    characters[target] = timings.characters[i] ?? '';
    starts[target] = timings.character_start_times_seconds[i] ?? 0;
    ends[target] = timings.character_end_times_seconds[i] ?? 0;
  }

  // A dropped tag leaves its neighbours' times intact, but any display
  // character the provider gave no time for would read as 0 and make the
  // highlight jump backwards. Carry the previous end forward instead.
  let lastEnd = 0;
  for (let d = 0; d < displayLength; d++) {
    if (ends[d] === 0 && d > 0) {
      ends[d] = lastEnd;
      starts[d] = lastEnd;
    }
    lastEnd = ends[d];
  }

  return {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  };
}
