import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { setSessionExpiredHandler } from '@/core/api/baseQuery';
import { getAccessToken, hydrateTokens } from '@/core/api/tokenStore';
import { persistor, store } from '@/store/store';
import { LoadingScreen } from '@/features/boot/LoadingScreen';
import { SplashScreen } from '@/features/boot/SplashScreen';
import { UpdateRequiredScreen } from '@/features/version/UpdateRequiredScreen';
import { useMinVersionGate } from '@/features/version/useMinVersionGate';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

/** How long the branded splash holds before handing off, win or lose the race
 * against token hydration underneath it. */
const SPLASH_DURATION_MS = 1400;

// Module-level, once per process — without this, a notification that
// arrives while the app is foregrounded is silently swallowed instead of
// shown.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <ThemeProvider>
              <RootNavigator />
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const versionGate = useMinVersionGate();

  // Tokens live in the keychain, so the first render cannot know whether there
  // is a session yet. Nothing is routed until that read resolves.
  useEffect(() => {
    let cancelled = false;
    hydrateTokens().finally(() => {
      if (cancelled) return;
      setReady(true);
      if (!getAccessToken()) router.replace('/login');
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // core/ has no navigator of its own, so it calls back here when a refresh
  // fails and the session is gone for good.
  useEffect(() => {
    setSessionExpiredHandler(() => router.replace('/login'));
    return () => setSessionExpiredHandler(null);
  }, [router]);

  // Independent of `ready` on purpose: this is a fixed brand beat, not a
  // wait-for-something gate, so it holds its length whether hydration
  // finishes before or after the timer.
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  // Takes priority over the auth-ready gate below — an unsupported build
  // should never reach the login screen, let alone anything behind it.
  if (versionGate.checked && versionGate.blocked) {
    return <UpdateRequiredScreen latestVersion={versionGate.latestVersion} />;
  }

  if (!ready) return <LoadingScreen />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
