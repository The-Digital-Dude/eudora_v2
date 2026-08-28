import LottieView from 'lottie-react-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * Shown while `RootNavigator` is genuinely waiting on something — token
 * hydration from the keychain, in practice — never on a fixed timer like
 * `SplashScreen`. Clio walking to school (with her bag and a bird) reads as
 * "on her way", which fits a screen that is here specifically because we
 * don't yet know where the user is headed (signed in, or `/login`).
 */
export function LoadingScreen() {
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
        source={require('../../../assets/lottie/mascot-clio-going-to-school-with-bag-and-a-bird.json')}
        autoPlay
        loop
        resizeMode="contain"
        style={{ width: 260, height: 146 }}
      />
      <View style={{ height: t.spacing.md }} />
      <Text variant="caption" color="mutedForeground">
        Getting things ready...
      </Text>
    </View>
  );
}
