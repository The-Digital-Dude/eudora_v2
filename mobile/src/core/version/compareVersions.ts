/**
 * Compares two `major.minor.patch` version strings. Returns negative if `a`
 * is older than `b`, positive if newer, 0 if equal. Missing/non-numeric
 * segments are treated as 0, so `'1.2'` and `'1.2.0'` compare equal.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = b.split('.').map((n) => parseInt(n, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isVersionBelow(current: string, minimum: string): boolean {
  return compareVersions(current, minimum) < 0;
}
