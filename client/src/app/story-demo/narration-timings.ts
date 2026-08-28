/**
 * Character-level narration timing, as the speech provider returns it and as it
 * is stored on the segment.
 */
export interface Timings {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/**
 * How many characters have been spoken by `seconds`.
 *
 * Lives in its own module, away from the component, for a practical reason:
 * the effect that calls it runs inside requestAnimationFrame, which does not
 * fire while the tab is hidden, so it cannot be exercised from an automated
 * browser. Here it is a pure function that can be run directly.
 *
 * Scans from the start on each call rather than advancing a cursor, so it stays
 * correct when the listener scrubs backwards.
 */
export function spokenCharCount(timings: Timings, seconds: number): number {
  const ends = timings.character_end_times_seconds;
  let spoken = 0;
  while (spoken < ends.length && ends[spoken] <= seconds) spoken++;
  return spoken;
}
