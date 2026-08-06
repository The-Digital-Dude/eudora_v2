import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import type { AppDispatch } from '@/store/store';
import { notificationsApi, useRegisterDeviceTokenMutation } from './notificationsApi';

// Kept module-level (not component state) so logout — which happens from
// wherever the user taps "Sign out", not from the screen that registered the
// token — can still unregister the same token it registered.
let currentToken: string | null = null;

function toPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Resolves an Expo push token for this install, or null if push isn't
 * available right now — no physical device, permission denied, or (the
 * likely case until an EAS project exists) no `extra.eas.projectId` in
 * `app.json` yet. That last case is expected: this is the client-side half
 * of the push infra: registration starts producing real tokens the moment
 * an EAS project is linked, with no code change here.
 */
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn(
      'Push notifications: no EAS projectId configured in app.json — skipping token registration.',
    );
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('Push notifications: failed to get Expo push token.', err);
    return null;
  }
}

/**
 * Fire-once per app session — call from a screen that only renders once a
 * user is authenticated (`app/index.tsx`), so it covers both cold start
 * with an existing session and a fresh login without needing a second call
 * site.
 */
export function useRegisterPushToken() {
  const [registerDeviceToken] = useRegisterDeviceTokenMutation();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    void getExpoPushToken().then((token) => {
      if (!token) return;
      currentToken = token;
      void registerDeviceToken({ token, platform: toPlatform() }).catch(() => {});
    });
  }, [registerDeviceToken]);
}

/**
 * Called from `authApi.ts`'s `logout.onQueryStarted` (a plain dispatch call,
 * not a hook, since that callback runs outside component context) so every
 * logout path unregisters the token without each call site needing to
 * remember to. Best-effort — logout must not block on this even if it fails.
 */
export async function unregisterCurrentPushToken(dispatch: AppDispatch) {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await dispatch(notificationsApi.endpoints.unregisterDeviceToken.initiate(token)).catch(
    () => {},
  );
}
