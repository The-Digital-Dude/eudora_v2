import { useRouter } from 'expo-router';
import { Award, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetBadgesQuery } from '@/features/gamification/gamificationApi';
import { useActingChild } from '@/features/guardian/useActingChild';
import { Card } from '@/ui/primitives/Card';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function BadgesScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { actingChildId } = useActingChild();
  const { data: badges, isLoading } = useGetBadgesQuery({ actingChildId });

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

      <Text variant="title">Badges</Text>
      <View style={{ height: t.spacing.xl }} />

      {isLoading || !badges ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : (
        <View style={{ gap: t.spacing.md }}>
          {badges.map((badge) => (
            <Card
              key={badge.code}
              style={{
                opacity: badge.earned ? 1 : 0.6,
                flexDirection: 'row',
                gap: t.spacing.md,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: t.radius.md,
                  backgroundColor: badge.earned ? t.colors.accent : t.colors.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award
                  size={22}
                  color={badge.earned ? t.colors.accentForeground : t.colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">{badge.name}</Text>
                <Text variant="caption" color="mutedForeground">
                  {badge.description}
                </Text>
                {!badge.earned ? (
                  <>
                    <View style={{ height: t.spacing.xs }} />
                    <ProgressBar
                      value={badge.maxProgress > 0 ? badge.progress / badge.maxProgress : 0}
                      height={5}
                    />
                    <View style={{ height: t.spacing.xs }} />
                    <Text variant="caption" color="mutedForeground">
                      {badge.progress}/{badge.maxProgress}
                    </Text>
                  </>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
