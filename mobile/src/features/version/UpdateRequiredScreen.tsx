import { RefreshCw } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface UpdateRequiredScreenProps {
  latestVersion: string | null;
}

/** No bypass — this is the whole point of the gate. */
export function UpdateRequiredScreen({ latestVersion }: UpdateRequiredScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: t.spacing.xl,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: t.radius.pill,
          backgroundColor: t.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RefreshCw size={28} color={t.colors.accentForeground} />
      </View>
      <View style={{ height: t.spacing.xl }} />
      <Text variant="title">Update required</Text>
      <View style={{ height: t.spacing.sm }} />
      <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
        This version of Eudora is no longer supported. Please update the app
        {latestVersion ? ` to version ${latestVersion}` : ''} to continue.
      </Text>
    </View>
  );
}
