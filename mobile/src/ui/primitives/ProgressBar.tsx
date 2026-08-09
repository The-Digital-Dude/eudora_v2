import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import type { ColorName } from '../theme/tokens';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: ColorName;
  height?: number;
}

export function ProgressBar({
  value,
  color = 'primary',
  height = 8,
}: ProgressBarProps) {
  const t = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    // Springs rather than a linear tween — progress advancing should feel like
    // it has weight, which is most of what separates this from a web bar.
    progress.value = withSpring(Math.max(0, Math.min(1, value)), {
      damping: 18,
      stiffness: 120,
    });
  }, [value, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={{
        height,
        backgroundColor: t.colors.muted,
        borderRadius: t.radius.pill,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: t.colors[color],
            borderRadius: t.radius.pill,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
