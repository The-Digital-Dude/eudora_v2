import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Tokens live in the Keychain / Android Keystore, never in redux-persist or
 * MMKV — those are plain files, and the refresh token is a 30-day credential.
 *
 * An in-memory mirror is kept so the hot path (attaching a bearer header to
 * every request) does not hit native storage each time. SecureStore reads can
 * block the JS thread, especially where biometric gating is enabled.
 *
 * Web has no Keychain/Keystore — expo-secure-store's web target is a stub, and
 * calling it throws. Persistence is intentionally *not* replaced with
 * localStorage there: this app does not target a web build, so the in-memory
 * cache alone (tokens survive for the tab's session, gone on reload) is enough
 * to develop and smoke-test against, without inventing a storage tier real
 * devices never use.
 */

const ACCESS_KEY = 'eudora.accessToken';
const REFRESH_KEY = 'eudora.refreshToken';
const persistable = Platform.OS !== 'web';

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let hydrated = false;

export async function hydrateTokens(): Promise<void> {
  if (hydrated) return;
  if (persistable) {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    cachedAccessToken = access;
    cachedRefreshToken = refresh;
  }
  hydrated = true;
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function getRefreshToken(): string | null {
  return cachedRefreshToken;
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  hydrated = true;
  if (persistable) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
  }
}

export async function clearTokens(): Promise<void> {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  hydrated = true;
  if (persistable) {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  }
}
