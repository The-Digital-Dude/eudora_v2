/**
 * Which child a guardian is currently "acting as".
 *
 * A guardian owns no `StudentProfile`, so on a shared family device the API
 * needs to be told which child a request is about. The choice is persisted
 * locally and sent as a header on every request; the server re-verifies the
 * guardian-child link on each one, so this value is a convenience, never a
 * credential.
 */
const STORAGE_KEY = "eudora.actingChildId";

/** Fired when the selection changes so open components can re-read it. */
export const ACTING_CHILD_EVENT = "eudora:acting-child-changed";

export function getActingChildId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private-mode / disabled storage — degrade to "no child selected"
    // rather than breaking the page.
    return null;
  }
}

export function setActingChildId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — selection just will not persist */
  }
  window.dispatchEvent(new CustomEvent(ACTING_CHILD_EVENT));
}
