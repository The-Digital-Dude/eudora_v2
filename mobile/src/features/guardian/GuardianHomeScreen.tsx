import { useRouter } from 'expo-router';
import { ChevronRight, CreditCard, GraduationCap, Settings, UserPlus, Users } from 'lucide-react-native';
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="heading">Your children</Text>
        <Pressable
          onPress={() => router.push('/guardian/add-child')}
          accessibilityRole="button"
          accessibilityLabel="Add a child"
          hitSlop={8}
        >
          <UserPlus size={20} color={t.colors.primary} />
        </Pressable>
      </View>
      <View style={{ height: t.spacing.md }} />
    </>
  );

  const childList =
    !children || children.length === 0 ? (
      <Card style={{ alignItems: 'center', paddingVertical: t.spacing.xxl }}>
        <Users size={28} color={t.colors.mutedForeground} />
        <View style={{ height: t.spacing.sm }} />
        <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
          No children on your account yet.
        </Text>
        <View style={{ height: t.spacing.lg }} />
        <Pressable
          onPress={() => router.push('/guardian/add-child')}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.sm,
            backgroundColor: t.colors.primary,
            borderRadius: t.radius.lg,
            paddingHorizontal: t.spacing.xl,
            paddingVertical: t.spacing.md,
          }}
        >
          <UserPlus size={18} color={t.colors.primaryForeground} />
          <Text variant="label" style={{ color: t.colors.primaryForeground }}>
            Add your first child
          </Text>
        </Pressable>
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
    <Card
      style={
        selected ? { borderColor: t.colors.primary, borderWidth: 2 } : undefined
      }
    >
      {/*
        Two Pressables, siblings rather than nested — react-native-web renders
        an `accessibilityRole="button"` Pressable as a real `<button>`, and a
        `<button>` cannot legally contain another `<button>`; the previous
        nested version rendered fine but hit React's hydration warning and
        invalid-DOM console error on the web target the moment a real child
        with `onOpenLearning` actually appeared. Splitting them keeps the two
        destinations distinct on every platform — the card opens this child's
        *records*, "Open learning" opens their *learning surface* — without
        putting one tap target inside the other's DOM node.
      */}
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
          {/* Null means nothing recorded — a child added through the family
              portal holds no class placement, so there is no register to mark
              them on. A full bar reading 100% would be inventing a result. */}
          <Text variant="caption" color={child.attendanceRate === null ? 'mutedForeground' : undefined}>
            {child.attendanceRate === null ? 'Not tracked yet' : `${child.attendanceRate}%`}
          </Text>
        </View>
        {child.attendanceRate !== null ? (
          <>
            <View style={{ height: t.spacing.xs }} />
            <ProgressBar
              value={child.attendanceRate / 100}
              color={child.attendanceRate >= 90 ? 'success' : 'warning'}
              height={5}
            />
          </>
        ) : null}

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
      </Pressable>

      {onOpenLearning ? (
        <>
          <View style={{ height: t.spacing.md }} />
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
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
