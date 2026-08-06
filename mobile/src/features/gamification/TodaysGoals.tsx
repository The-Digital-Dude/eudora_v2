import { CheckCircle2, Circle } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Card } from '@/ui/primitives/Card';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { useGetTodaysGoalsQuery } from './gamificationApi';

/** Mirrors the web home page's pinned `TodaysGoals` widget. */
export function TodaysGoals() {
  const t = useTheme();
  const { data } = useGetTodaysGoalsQuery();

  if (!data || data.goals.length === 0) return null;

  return (
    <Card>
      <Text variant="heading">Today&apos;s goals</Text>
      <View style={{ height: t.spacing.md }} />
      <View style={{ gap: t.spacing.md }}>
        {data.goals.map((goal) => {
          const done = goal.progress >= goal.target;
          return (
            <View key={goal.key}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.sm,
                  marginBottom: t.spacing.xs,
                }}
              >
                {done ? (
                  <CheckCircle2 size={16} color={t.colors.success} />
                ) : (
                  <Circle size={16} color={t.colors.mutedForeground} />
                )}
                <Text variant="body" style={{ flex: 1 }}>
                  {goal.label}
                </Text>
                <Text variant="caption" color="mutedForeground">
                  {goal.progress}/{goal.target}
                </Text>
              </View>
              <ProgressBar
                value={goal.target > 0 ? goal.progress / goal.target : 0}
                color={done ? 'success' : 'primary'}
                height={6}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}
