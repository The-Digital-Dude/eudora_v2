/**
 * Resolves a client-supplied sort field against an allowlist before it reaches
 * Prisma's `orderBy`. An unrecognized or absent `sortBy` falls back to the
 * caller's default rather than throwing — a stale `sortBy` left over in a
 * bookmarked or shared URL (e.g. after a column is renamed) should degrade
 * quietly, not break the page.
 */
export function resolveSort<T extends string>(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowed: readonly T[],
  fallback: T,
): Record<string, 'asc' | 'desc'> {
  const field = (allowed as readonly string[]).includes(sortBy ?? '')
    ? (sortBy as T)
    : fallback;
  const direction = sortOrder === 'desc' ? 'desc' : 'asc';
  return { [field]: direction };
}
