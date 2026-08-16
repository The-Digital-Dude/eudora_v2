/**
 * Return-URL handling for the checkout funnel.
 *
 * A buyer who hits "Enrol" while logged out bounces through login, possibly
 * registration, possibly profile completion, and has to land back on the exact
 * checkout they started. That destination travels in a `next` query parameter,
 * which makes it attacker-controllable — so it is validated everywhere it is
 * read, never just where it is written.
 */

/** Only same-origin relative paths. Rejects `https://evil.com` and `//evil.com`. */
export function isSafeNext(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  // `//host` and `/\host` are protocol-relative and would leave the site.
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  return true;
}

/**
 * Reads `next` from the current URL.
 *
 * Uses `window.location` rather than `useSearchParams`, matching the
 * convention already used by the login and explore pages — it keeps these
 * routes prerenderable without wrapping them in a Suspense boundary.
 */
export function readNextParam(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("next");
  return isSafeNext(raw) ? raw : null;
}

/** Builds `/login?next=…` (or any auth path) preserving the full destination. */
export function withNext(path: string, next: string | null): string {
  if (!isSafeNext(next)) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(next)}`;
}

/** The full current path + query, for use as a `next` value. */
export function currentPathWithQuery(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}
