"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

/** Values a list view can round-trip through the query string. */
export type ListQueryValue = string | number;

export interface ListQueryStateOptions<T> {
  /**
   * Key holding the current page number. When set, changing any other key clears it — otherwise
   * narrowing a filter while on page 3 leaves you stranded on an empty page 3.
   */
  pageKey?: Extract<keyof T, string>;
}

export interface ListQueryState<T> {
  /** Current values, with defaults applied for anything absent from the URL. */
  values: T;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Applies several keys in one navigation, rather than one per key. */
  setValues: (next: Partial<T>) => void;
  /** Clears every managed key. Query params this hook doesn't manage are left alone. */
  reset: () => void;
}

/**
 * Drives a list view's filter/sort/search/page state from the URL query string instead of local
 * component state, so the view is bookmarkable, shareable, and survives a refresh.
 *
 * Keys sitting at their default value are omitted from the URL, so an untouched list keeps a clean
 * path. Updates go through `router.replace`, which keeps the back button a way out of the page
 * instead of an undo stack for every filter change.
 *
 * `defaults` is captured once on mount: it defines both the managed keys and each key's type — a
 * numeric default makes that param parse as a number. Pass an object literal, not a value that
 * changes between renders.
 */
export function useListQueryState<T extends Record<string, ListQueryValue>>(
  defaults: T,
  options: ListQueryStateOptions<T> = {},
): ListQueryState<T> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pageKey } = options;

  // Captured once: the initializer runs on mount only, which freezes the managed key set and each
  // key's type even if the caller passes a fresh object literal on every render.
  const [managedDefaults] = React.useState<Record<string, ListQueryValue>>(() => defaults);

  const values = React.useMemo(() => {
    const resolved: Record<string, ListQueryValue> = { ...managedDefaults };
    for (const key of Object.keys(managedDefaults)) {
      const raw = searchParams.get(key);
      if (raw === null) continue;
      const fallback = managedDefaults[key];
      if (typeof fallback === "number") {
        const parsed = Number(raw);
        resolved[key] = Number.isFinite(parsed) ? parsed : fallback;
      } else {
        resolved[key] = raw;
      }
    }
    return resolved as T;
  }, [managedDefaults, searchParams]);

  const setValues = React.useCallback(
    (next: Partial<T>) => {
      const managed = managedDefaults;
      const params = new URLSearchParams(searchParams.toString());

      // Changing a filter invalidates the current page, so drop it — unless the caller is setting
      // the page itself, which is exactly what paging through a list does.
      if (pageKey && !(pageKey in next) && Object.keys(next).some((key) => key !== pageKey)) {
        params.delete(pageKey);
      }

      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === null || value === managed[key]) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [managedDefaults, pageKey, pathname, router, searchParams],
  );

  const setValue = React.useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const patch: Partial<T> = {};
      patch[key] = value;
      setValues(patch);
    },
    [setValues],
  );

  const reset = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of Object.keys(managedDefaults)) params.delete(key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [managedDefaults, pathname, router, searchParams]);

  return { values, setValue, setValues, reset };
}

/**
 * Keeps a search box responsive while the URL only catches up once typing settles, so a keystroke
 * doesn't become a navigation — and, on server-filtered lists, a request.
 *
 * Returns the draft value to bind to the input plus its setter. `commit` is held in a ref, so an
 * inline arrow is fine here and won't restart the timer on every render.
 */
export function useDebouncedQueryInput(
  value: string,
  commit: (next: string) => void,
  delay = 300,
): [string, (next: string) => void] {
  const [draft, setDraft] = React.useState(value);

  const commitRef = React.useRef(commit);
  React.useEffect(() => {
    commitRef.current = commit;
  });

  // Re-sync when the URL changes from somewhere other than this input — back/forward, or a reset.
  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  React.useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => commitRef.current(draft), delay);
    return () => clearTimeout(timer);
  }, [draft, value, delay]);

  return [draft, setDraft];
}
