import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import {
  getActingChildId,
  setActingChildId,
  subscribeToActingChild,
} from '@/core/api/actingChildStore';
import type { ChildSummary } from '@/core/contracts';
import { useGetMeQuery } from '@/features/auth/authApi';

import { useGetChildrenQuery } from './guardianApi';

export interface ActingChild {
  /** Every child this guardian can act for. Empty for a student account. */
  children: ChildSummary[];
  isLoading: boolean;
  activeChild: ChildSummary | null;
  /**
   * The id to thread into child-varying query args.
   *
   * Null means "do not scope" — either the caller is a student acting as
   * themselves, or a guardian with no children yet. Both are legitimate; a
   * query given null should either skip or fall back to the caller's own
   * profile, never guess a child.
   */
  actingChildId: string | null;
  /**
   * The student profile this screen is about, for endpoints addressed by id
   * rather than by header — `/homework/student/:id`, `/gradebook/student/:id`.
   *
   * Distinct from `actingChildId`, and the difference matters: a student
   * resolves to their *own* profile here while `actingChildId` stays null,
   * because they send no header. Null only when there is genuinely no learner
   * yet — a guardian who has not added a child.
   */
  learnerId: string | null;
  /** True when the signed-in user is a guardian rather than a learner. */
  isGuardian: boolean;
  select: (studentProfileId: string) => void;
}

/**
 * Single source of truth for which child a guardian is acting as.
 *
 * The web client learned this the hard way (`client/src/features/parent/
 * useActingChild.ts`): the selection lived both in storage, which decided the
 * `x-acting-student-id` header, and in component state, which decided what was
 * on screen. Only one place ever wrote to storage, so a guardian with two
 * children was permanently acting as one while looking at the other. Everything
 * that lets a guardian pick a child goes through here so the header and the
 * screen cannot disagree.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: several trees
 * (a switcher in a header, a child list, a course screen) read this
 * simultaneously, and they must re-render from one subscription rather than
 * each holding a copy that updates a tick apart.
 */
export function useActingChild(): ActingChild {
  const { data: me } = useGetMeQuery();

  // A student account has no children to fetch and no guardian profile to fetch
  // them with; asking would be a guaranteed empty round-trip on every mount.
  const isGuardian = Boolean(me?.guardianProfile);
  const { data: children = [], isLoading } = useGetChildrenQuery(undefined, {
    skip: !isGuardian,
  });

  const storedId = useSyncExternalStore(
    subscribeToActingChild,
    getActingChildId,
    getActingChildId,
  );

  // Falls back to the first child when the stored id is absent, or points at a
  // child this guardian can no longer see — a removed link, or a stale id left
  // by another account on a shared family device.
  const activeChild = useMemo(() => {
    if (!isGuardian || children.length === 0) return null;
    return children.find((c) => c.studentProfileId === storedId) ?? children[0];
  }, [isGuardian, children, storedId]);

  // Write the fallback back so the header matches what is on screen. Without
  // this the UI would show the first child while the API still received the
  // stale id — which is the drift this hook exists to prevent.
  useEffect(() => {
    if (activeChild && activeChild.studentProfileId !== storedId) {
      setActingChildId(activeChild.studentProfileId);
    }
  }, [activeChild, storedId]);

  const select = useCallback((studentProfileId: string) => {
    setActingChildId(studentProfileId);
  }, []);

  return {
    children,
    isLoading: isGuardian && isLoading,
    activeChild,
    // Deliberately reads from `activeChild`, not from storage: during the tick
    // before the effect above runs they can differ, and a query keyed on a
    // stale id would fetch data the screen is not showing.
    actingChildId: activeChild?.studentProfileId ?? null,
    // A guardian is never also the learner; a student always is. Falling back
    // to the caller's own profile keeps every student screen working untouched
    // by the guardian path.
    learnerId: activeChild?.studentProfileId ?? me?.studentProfile?.id ?? null,
    isGuardian,
    select,
  };
}
