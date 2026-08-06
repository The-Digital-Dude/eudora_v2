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
import { UpdateRequiredScreen } from '@/features/version/UpdateRequiredScreen';
import { useMinVersionGate } from '@/features/version/useMinVersionGate';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

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

  // Takes priority over the auth-ready gate below — an unsupported build
  // should never reach the login screen, let alone anything behind it.
  if (versionGate.checked && versionGate.blocked) {
    return <UpdateRequiredScreen latestVersion={versionGate.latestVersion} />;
  }

  if (!ready) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
