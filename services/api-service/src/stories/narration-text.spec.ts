import {
  narrationMatchesText,
  remapTimings,
  stripNarrationTags,
} from './narration-text';

describe('stripNarrationTags', () => {
  it('removes a tag and the space that followed it', () => {
    expect(stripNarrationTags('[excited] She ran.').display).toBe('She ran.');
  });

  it('removes tags in the middle of a line', () => {
    expect(stripNarrationTags('She looked. [sad] Then she left.').display).toBe(
      'She looked. Then she left.',
    );
  });

  it('leaves an unclosed bracket alone', () => {
    // Otherwise a stray "[" would swallow the rest of the story silently.
    expect(stripNarrationTags('a [ b').display).toBe('a [ b');
  });

  it('maps every kept character to its display position', () => {
    const { display, indexMap } = stripNarrationTags('[sad] Hi');
    expect(display).toBe('Hi');
    // "[sad] " is six characters, all dropped.
    expect(indexMap.slice(0, 6)).toEqual([-1, -1, -1, -1, -1, -1]);
    expect(indexMap.slice(6)).toEqual([0, 1]);
  });
});

describe('narrationMatchesText', () => {
  it('accepts tagged narration of the same words', () => {
    expect(
      narrationMatchesText(
        '[whispers] The bridge was old.',
        'The bridge was old.',
      ),
    ).toBe(true);
  });

  it('rejects narration that changed a word', () => {
    // The guard that keeps audio from saying something the page does not.
    expect(
      narrationMatchesText(
        '[whispers] The bridge was ancient.',
        'The bridge was old.',
      ),
    ).toBe(false);
  });

  it('rejects narration that added a word outside a tag', () => {
    expect(narrationMatchesText('She ran fast.', 'She ran.')).toBe(false);
  });
});

describe('remapTimings', () => {
  /** "[sad] Hi" — six dropped characters, then H and i. */
  const tagged = '[sad] Hi';
  const providerTimings = {
    characters: ['[', 's', 'a', 'd', ']', ' ', 'H', 'i'],
    character_start_times_seconds: [0, 0, 0, 0, 0, 0, 0.5, 0.7],
    character_end_times_seconds: [0, 0, 0, 0, 0, 0.5, 0.7, 0.9],
  };

  it('reindexes timings onto the display text', () => {
    const { display, indexMap } = stripNarrationTags(tagged);
    const mapped = remapTimings(providerTimings, indexMap, display.length);

    expect(mapped.characters).toEqual(['H', 'i']);
    expect(mapped.character_end_times_seconds).toEqual([0.7, 0.9]);
  });

  it('produces one timing per display character', () => {
    const { display, indexMap } = stripNarrationTags(tagged);
    const mapped = remapTimings(providerTimings, indexMap, display.length);

    // The reader slices the text by this count; a mismatch would highlight the
    // wrong words for the whole segment.
    expect(mapped.character_end_times_seconds).toHaveLength(display.length);
  });

  it('never lets end times move backwards', () => {
    const { display, indexMap } = stripNarrationTags('[a] one [b] two');
    const ends = new Array(15).fill(0).map((_, i) => i * 0.1);
    const mapped = remapTimings(
      {
        characters: '[a] one [b] two'.split(''),
        character_start_times_seconds: ends,
        character_end_times_seconds: ends,
      },
      indexMap,
      display.length,
    );

    const times = mapped.character_end_times_seconds;
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });
});
