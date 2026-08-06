import { MMKV } from 'react-native-mmkv';

/**
 * Which home screen a dual student+guardian profile account currently views
 * — a no-op for every other account (`app/index.tsx` only reads this when
 * `me.studentProfile && me.guardianProfile` are both present). Deliberately
 * a separate MMKV instance from `core/persist/mmkvStorage.ts`'s
 * `rtk-query-cache` one — this is a plain UI preference, not query-cache
 * data, and doesn't belong in the redux-persist pipeline.
 */
const mmkv = new MMKV({ id: 'ui-preferences' });
const KEY = 'dualProfileView';

export type ProfileView = 'student' | 'guardian';

export function getStoredView(): ProfileView | null {
  const value = mmkv.getString(KEY);
  return value === 'student' || value === 'guardian' ? value : null;
}

export function setStoredView(view: ProfileView) {
  mmkv.set(KEY, view);
}
