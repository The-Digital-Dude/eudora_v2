import { MMKV } from 'react-native-mmkv';

/**
 * Which child a guardian is currently acting for.
 *
 * The API resolves *which learner a request is about* from the
 * `x-acting-student-id` header (see api-service
 * `entitlements/acting-student.service.ts`). A guardian owns no StudentProfile,
 * so without this header they are resolved to nobody and get 403 or empty on
 * their own children's purchased content.
 *
 * Deliberately NOT in SecureStore alongside the tokens: this is a UI selection,
 * not a credential. It grants nothing on its own — the server re-checks the
 * guardian-child link on every single request and ignores the header entirely
 * for callers who are themselves students. Tampering with this value buys an
 * attacker a 403.
 *
 * Kept in the same `ui-preferences` MMKV instance the retired
 * `viewPreference.ts` used, and mirrored in memory because `prepareHeaders`
 * runs on every request and must not touch native storage on that path — the
 * same reasoning as `tokenStore.ts`.
 */
const mmkv = new MMKV({ id: 'ui-preferences' });
const KEY = 'actingChildId';

let cached: string | null | undefined;

/** Listeners are notified so separate component trees cannot drift apart. */
type Listener = (id: string | null) => void;
const listeners = new Set<Listener>();

export function getActingChildId(): string | null {
  if (cached === undefined) {
    cached = mmkv.getString(KEY) ?? null;
  }
  return cached;
}

export function setActingChildId(id: string | null): void {
  if (getActingChildId() === id) return;
  cached = id;
  if (id) {
    mmkv.set(KEY, id);
  } else {
    mmkv.delete(KEY);
  }
  for (const listener of listeners) listener(id);
}

export function subscribeToActingChild(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Called on sign-out. A shared family tablet is the normal case for this app,
 * so leaving the previous account's child id behind would mean the next
 * guardian's first requests carry a student id they have no link to.
 */
export function clearActingChild(): void {
  setActingChildId(null);
}
