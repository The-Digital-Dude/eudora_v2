import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export function Card({ style, ...rest }: ViewProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.card,
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: t.colors.border,
          padding: t.spacing.lg,
        },
        style,
      ]}
      {...rest}
    />
  );
}
