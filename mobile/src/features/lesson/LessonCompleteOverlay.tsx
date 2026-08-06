import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ConfettiOverlay } from '@/features/gamification/ConfettiOverlay';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { Mascot } from '@/ui/mascot/Mascot';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface LessonCompleteOverlayProps {
  xpEarned: number;
  onContinue: () => void;
}

/** Mirrors the web `LessonCompleteModal`: confetti + celebrating mascot + total XP. */
export function LessonCompleteOverlay({ xpEarned, onContinue }: LessonCompleteOverlayProps) {
  const t = useTheme();

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: t.colors.background + 'e6',
          alignItems: 'center',
          justifyContent: 'center',
          padding: t.spacing.xl,
        },
      ]}
    >
      <ConfettiOverlay />
      <Card style={{ alignItems: 'center', width: '100%', maxWidth: 360 }}>
        <Mascot state="celebrate" size={140} />
        <View style={{ height: t.spacing.md }} />
        <Text variant="title">Lesson complete!</Text>
        <View style={{ height: t.spacing.xs }} />
        <Text variant="label" color="primary">
          +{xpEarned} XP earned
        </Text>
        <View style={{ height: t.spacing.xl }} />
        <Button title="Continue" onPress={onContinue} fullWidth />
      </Card>
    </View>
  );
}
