import { useRouter } from 'expo-router';
import { ChevronRight, CreditCard, GraduationCap, Settings, Users } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ChildSummary } from '@/core/contracts';
import { useGetMeQuery } from '@/features/auth/authApi';
import { Card } from '@/ui/primitives/Card';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Text } from '@/ui/primitives/Text';
import { useFormFactor } from '@/ui/useFormFactor';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { ChildDetailPanel } from './ChildDetailPanel';
import { useGetChildrenQuery } from './guardianApi';
import { useActingChild } from './useActingChild';

interface GuardianHomeScreenProps {
  /**
   * Opens the selected child's learning surface. Selecting a child here also
   * sets the acting-child id, so what the guardian opens and what the API
   * answers for are always the same learner.
   */
  onOpenChildView?: () => void;
}

export function GuardianHomeScreen({ onOpenChildView }: GuardianHomeScreenProps = {}) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const formFactor = useFormFactor();
  const { data: me } = useGetMeQuery();
  const { children, isLoading, activeChild, select } = useActingChild();
  const { isFetching, refetch } = useGetChildrenQuery(undefined, {
    skip: !me?.guardianProfile,
  });

  // Tablet only: which child's detail shows in the right-hand pane. Kept in
  // step with the acting child rather than tracked separately — a second
  // source of truth for "which child" is exactly the bug `useActingChild`
  // exists to prevent.
  const selectedChildId = activeChild?.studentProfileId ?? null;

  const openLearning = (studentProfileId: string) => {
    select(studentProfileId);
    onOpenChildView?.();
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.background,
        }}
      >
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

  const header = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Text variant="caption" color="mutedForeground">
            {greeting()}
          </Text>
          <Text variant="title">{me?.firstName || me?.email || 'Guardian'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
          >
            <Settings size={22} color={t.colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/*
        The Messages card that sat here has been removed: the API's messaging
        module was deleted on 2026-08-16, so it rendered an unread badge off an
        endpoint that 404s. Ordinarily that removal belongs to W3 with the rest
        of the dead messaging code, but this screen is now the app's root and
        shipping the spine with a broken card as its most prominent element is
        not a defensible intermediate state. `src/features/messaging/` and
        `app/messages/*` still await W3.
      */}
      <View style={{ height: t.spacing.xl }} />
      <View style={{ gap: t.spacing.md }}>
        <Pressable onPress={() => router.push('/billing')} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <CreditCard size={18} color={t.colors.primary} />
            <Text variant="label" style={{ flex: 1 }}>
              Billing
            </Text>
            <ChevronRight size={18} color={t.colors.mutedForeground} />
          </Card>
        </Pressable>
      </View>

      <View style={{ height: t.spacing.xl }} />
      <Text variant="heading">Your children</Text>
      <View style={{ height: t.spacing.md }} />
    </>
  );

  const childList =
    !children || children.length === 0 ? (
      <Card style={{ alignItems: 'center', paddingVertical: t.spacing.xxl }}>
        <Users size={28} color={t.colors.mutedForeground} />
        <View style={{ height: t.spacing.sm }} />
        <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
          No students linked to your account yet.
        </Text>
      </Card>
    ) : (
      <View style={{ gap: t.spacing.md }}>
        {children.map((child) =>
          formFactor === 'tablet' ? (
            <ChildCard
              key={child.studentProfileId}
              child={child}
              selected={child.studentProfileId === selectedChildId}
              onPress={() => select(child.studentProfileId)}
              onOpenLearning={() => openLearning(child.studentProfileId)}
            />
          ) : (
            <ChildCard
              key={child.studentProfileId}
              child={child}
              onOpenLearning={() => openLearning(child.studentProfileId)}
            />
          ),
        )}
      </View>
    );

  // Tablet: master-detail — a persistent ~340px child list beside the
  // selected child's detail, matching the web's sidebar-width convention
  // (§5 of the plan) rather than the phone's tap-to-navigate flow.
  if (formFactor === 'tablet') {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.colors.background }}>
        <ScrollView
          style={{ width: 340, borderRightWidth: 1, borderRightColor: t.colors.border }}
          contentContainerStyle={{
            padding: t.spacing.xl,
            paddingTop: insets.top + t.spacing.lg,
            paddingBottom: insets.bottom + t.spacing.xxl,
          }}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
          }
        >
          {header}
          {childList}
        </ScrollView>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: t.spacing.xl,
            paddingTop: insets.top + t.spacing.lg,
            paddingBottom: insets.bottom + t.spacing.xxl,
          }}
        >
          {selectedChildId ? (
            <ChildDetailPanel studentProfileId={selectedChildId} />
          ) : (
            <Text variant="body" color="mutedForeground">
              Select a child to see their activity.
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      contentContainerStyle={{
        padding: t.spacing.xl,
        paddingTop: insets.top + t.spacing.lg,
        paddingBottom: insets.bottom + t.spacing.xxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => void refetch()}
          tintColor={t.colors.primary}
        />
      }
    >
      {header}
      {childList}
    </ScrollView>
  );
}

function ChildCard({
  child,
  selected,
  onPress,
  onOpenLearning,
}: {
  child: ChildSummary;
  /** Tablet mode only — highlights the card and calls `onPress` instead of navigating. */
  selected?: boolean;
  onPress?: () => void;
  /** Opens this child's learning surface, making them the acting child. */
  onOpenLearning?: () => void;
}) {
  const t = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={
        onPress ??
        (() =>
          router.push({
            pathname: '/guardian/[studentProfileId]',
            params: { studentProfileId: child.studentProfileId },
          }))
      }
      accessibilityRole="button"
    >
      <Card
        style={
          selected
            ? { borderColor: t.colors.primary, borderWidth: 2 }
            : undefined
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="label">{child.fullName}</Text>
            <Text variant="caption" color="mutedForeground">
              {child.classSection?.name ?? 'No class assigned'}
            </Text>
          </View>
          {onPress ? null : <ChevronRight size={20} color={t.colors.mutedForeground} />}
        </View>

        <View style={{ height: t.spacing.md }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" color="mutedForeground">
            Attendance
          </Text>
          <Text variant="caption">{child.attendanceRate}%</Text>
        </View>
        <View style={{ height: t.spacing.xs }} />
        <ProgressBar
          value={child.attendanceRate / 100}
          color={child.attendanceRate >= 90 ? 'success' : 'warning'}
          height={5}
        />

        <View style={{ height: t.spacing.md }} />

        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
          <Text variant="caption" color="mutedForeground" style={{ flex: 1 }}>
            {child.pendingHomeworkCount} homework due
          </Text>
          {child.latestGrade ? (
            <Text variant="caption" color="mutedForeground">
              Last grade: {Math.round(child.latestGrade.percentage ?? 0)}%
            </Text>
          ) : null}
        </View>

        {onOpenLearning ? (
          <>
            <View style={{ height: t.spacing.md }} />
            {/*
              Nested inside the card's Pressable deliberately: the card opens
              this child's *records*, this opens their *learning surface*. Two
              destinations, so the tap targets are separate rather than the
              guardian guessing which one a single tap means.
            */}
            <Pressable
              onPress={onOpenLearning}
              accessibilityRole="button"
              accessibilityLabel={`Open ${child.fullName}'s learning`}
              hitSlop={6}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.sm,
                paddingVertical: t.spacing.sm,
              }}
            >
              <GraduationCap size={16} color={t.colors.primary} />
              <Text variant="label" color="primary">
                Open learning
              </Text>
            </Pressable>
          </>
        ) : null}
      </Card>
    </Pressable>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
