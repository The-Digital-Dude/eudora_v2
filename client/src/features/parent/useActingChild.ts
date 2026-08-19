"use client";

import * as React from "react";

import {
  ACTING_CHILD_EVENT,
  getActingChildId,
  setActingChildId,
} from "@/lib/acting-child";

import { useGetChildrenQuery } from "./parentApi";

/**
 * Single source of truth for which child a guardian is acting as.
 *
 * Before this hook the selection lived in two places that could not agree:
 * localStorage (which decides the `x-acting-student-id` header on every API
 * call) and a local `useState` in the parent portal (which decided what was on
 * screen). Only `AddChildForm` ever wrote to localStorage, so a guardian with
 * two children was permanently acting as whichever was added last while the UI
 * happily showed the other one.
 *
 * Everything that lets a guardian pick a child should go through here, so the
 * header and the screen cannot drift apart.
 */
export function useActingChild() {
  const { data: children = [], isLoading } = useGetChildrenQuery();
  const [actingId, setActingIdState] = React.useState<string | null>(null);

  // Read from storage after mount, never during render: the server has no
  // localStorage, so touching it earlier would produce a hydration mismatch.
  React.useEffect(() => {
    setActingIdState(getActingChildId());
  }, []);

  // Keep every mounted consumer in step — the topbar switcher and the portal's
  // child cards are separate trees and would otherwise diverge.
  React.useEffect(() => {
    const sync = () => setActingIdState(getActingChildId());
    window.addEventListener(ACTING_CHILD_EVENT, sync);
    return () => window.removeEventListener(ACTING_CHILD_EVENT, sync);
  }, []);

  // Fall back to the first child when the stored id is absent or points at a
  // child this guardian can no longer see (removed, or a stale id from another
  // account on a shared device).
  const resolved = React.useMemo(() => {
    if (children.length === 0) return null;
    const stored = children.find((c) => c.studentProfileId === actingId);
    return stored ?? children[0];
  }, [children, actingId]);

  // Write the fallback back to storage so the header matches what is shown.
  // Without this the UI would display the first child while the API still
  // received the stale id.
  React.useEffect(() => {
    if (resolved && resolved.studentProfileId !== actingId) {
      setActingChildId(resolved.studentProfileId);
    }
  }, [resolved, actingId]);

  const select = React.useCallback((studentProfileId: string) => {
    setActingChildId(studentProfileId);
  }, []);

  return {
    children,
    isLoading,
    activeChild: resolved,
    activeChildId: resolved?.studentProfileId ?? null,
    select,
  };
}
