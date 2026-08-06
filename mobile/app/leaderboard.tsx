import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetLeaderboardQuery } from '@/features/gamification/gamificationApi';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

type Scope = 'class' | 'year';

export default function LeaderboardScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>('class');
  const { data, isLoading, isFetching } = useGetLeaderboardQuery(scope);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      contentContainerStyle={{
        padding: t.spacing.xl,
        paddingTop: insets.top + t.spacing.md,
        paddingBottom: insets.bottom + t.spacing.xxl,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: t.spacing.lg }}
      >
        <ChevronLeft size={20} color={t.colors.mutedForeground} />
        <Text variant="label" color="mutedForeground">
          Back
        </Text>
      </Pressable>

      <Text variant="title">Leaderboard</Text>
      <View style={{ height: t.spacing.lg }} />

      <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
        <ScopeTab label="My class" active={scope === 'class'} onPress={() => setScope('class')} />
        <ScopeTab label="My year" active={scope === 'year'} onPress={() => setScope('year')} />
      </View>

      <View style={{ height: t.spacing.xl }} />

      {isLoading || !data ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : data.data.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No ranked classmates yet for this scope.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm, opacity: isFetching ? 0.6 : 1 }}>
          {data.data.map((entry) => {
            const isMe = entry.studentProfileId === data.me?.studentProfileId;
            return (
              <Card
                key={entry.studentProfileId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                  borderColor: isMe ? t.colors.primary : t.colors.border,
                }}
              >
                <View
                  style={{
                    width: 28,
                    alignItems: 'center',
                  }}
                >
                  {entry.rank <= 3 ? (
                    <Trophy
                      size={18}
                      color={
                        entry.rank === 1
                          ? t.colors.warning
                          : entry.rank === 2
                            ? t.colors.mutedForeground
                            : '#b08d57'
                      }
                    />
                  ) : (
                    <Text variant="label" color="mutedForeground">
                      {entry.rank}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label">
                    {entry.fullName}
                    {isMe ? ' (you)' : ''}
                  </Text>
                  <Text variant="caption" color="mutedForeground">
                    Level {entry.level}
                  </Text>
                </View>
                <Text variant="label" color="primary">
                  {entry.totalXp} XP
                </Text>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function ScopeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1 }}>
      <View
        style={{
          paddingVertical: t.spacing.sm,
          borderRadius: t.radius.md,
          alignItems: 'center',
          backgroundColor: active ? t.colors.primary : t.colors.secondary,
        }}
      >
        <Text
          variant="label"
          color={active ? 'primaryForeground' : 'secondaryForeground'}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
