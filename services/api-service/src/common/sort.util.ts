/**
 * Resolves a client-supplied sort field against an allowlist before it reaches
 * Prisma's `orderBy`. An unrecognized or absent `sortBy` falls back to the
 * caller's default field+direction rather than throwing — a stale `sortBy`
 * left over in a bookmarked or shared URL (e.g. after a column is renamed)
 * should degrade quietly, not break the page.
 *
 * `fallbackDirection` must match whatever direction the endpoint's `orderBy`
 * used before sorting existed — when no `sortBy` is present, `sortOrder` is
 * ignored entirely and the original default direction is reproduced exactly,
 * rather than silently defaulting to 'asc' regardless of what the endpoint
 * used to do.
 */
export function resolveSort<T extends string>(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowed: readonly T[],
  fallback: T,
  fallbackDirection: 'asc' | 'desc' = 'asc',
): Record<string, 'asc' | 'desc'> {
  const isValidField = (allowed as readonly string[]).includes(sortBy ?? '');
  if (!isValidField) {
    return { [fallback]: fallbackDirection };
  }
  const direction = sortOrder === 'desc' ? 'desc' : 'asc';
  return { [sortBy as T]: direction };
}
