import LottieView from 'lottie-react-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * The branded moment shown for a fixed beat right after the native launch
 * screen hands off to JS — see `_layout.tsx`'s `showSplash` timer. Distinct
 * from `LoadingScreen`: this one is never waiting on anything (no spinner,
 * no async state), so it plays the same length regardless of how fast
 * `hydrateTokens()` resolves underneath it.
 *
 * Wompush rather than Clio: Clio is reserved for lesson/tutoring contexts
 * (`Mascot.tsx`) and for the loading gate right after this screen — using her
 * here too would make the two hand off with no visual change to notice.
 */
export function SplashScreen() {
  const t = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LottieView
        source={require('../../../assets/lottie/wompush-charecter-waving-hello.json')}
        autoPlay
        loop
        style={{ width: 200, height: 200 }}
      />
      <View style={{ height: t.spacing.lg }} />
      <Text variant="title">Eudora</Text>
    </View>
  );
}
