import { MMKV } from 'react-native-mmkv';
import type { Storage } from 'redux-persist';

/**
 * redux-persist expects an async Storage interface; MMKV is synchronous, so
 * every call just wraps its result in an already-resolved Promise. Unlike
 * expo-secure-store, react-native-mmkv ships a real web implementation
 * (backed by localStorage) — no platform guard needed here.
 */
const mmkv = new MMKV({ id: 'rtk-query-cache' });

export const mmkvStorage: Storage = {
  setItem(key, value) {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem(key) {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem(key) {
    mmkv.delete(key);
    return Promise.resolve();
  },
};
