import { useRouter } from 'expo-router';
import { ArrowLeftRight, ChevronRight, CreditCard, MessageSquare, Settings, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ChildSummary } from '@/core/contracts';
import { useGetMeQuery } from '@/features/auth/authApi';
import { Card } from '@/ui/primitives/Card';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Text } from '@/ui/primitives/Text';
import { useFormFactor } from '@/ui/useFormFactor';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { useGetUnreadMessageCountQuery } from '@/features/messaging/messagingApi';
import { ChildDetailPanel } from './ChildDetailPanel';
import { useGetChildrenQuery } from './guardianApi';

interface GuardianHomeScreenProps {
  /** Only passed by `app/index.tsx` when the account also has a StudentProfile. */
  onSwitchToStudent?: () => void;
}

export function GuardianHomeScreen({ onSwitchToStudent }: GuardianHomeScreenProps = {}) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const formFactor = useFormFactor();
  const { data: me } = useGetMeQuery();
  const { data: children, isLoading, isFetching, refetch } = useGetChildrenQuery();
  const { data: unreadMessages } = useGetUnreadMessageCountQuery();

  // Tablet only: which child's detail shows in the right-hand pane.
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedChildId && children && children.length > 0) {
      setSelectedChildId(children[0].studentProfileId);
    }
  }, [children, selectedChildId]);

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
          {onSwitchToStudent ? (
            <Pressable
              onPress={onSwitchToStudent}
              accessibilityRole="button"
              accessibilityLabel="Switch to student view"
              hitSlop={8}
            >
              <ArrowLeftRight size={22} color={t.colors.mutedForeground} />
            </Pressable>
          ) : null}
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
        <Pressable onPress={() => router.push('/messages')} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <MessageSquare size={18} color={t.colors.primary} />
            <Text variant="label" style={{ flex: 1 }}>
              Messages
            </Text>
            {unreadMessages && unreadMessages.count > 0 ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}
              >
                <Text variant="caption" style={{ color: t.colors.primaryForeground }}>
                  {unreadMessages.count}
                </Text>
              </View>
            ) : (
              <ChevronRight size={18} color={t.colors.mutedForeground} />
            )}
          </Card>
        </Pressable>
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
              onPress={() => setSelectedChildId(child.studentProfileId)}
            />
          ) : (
            <ChildCard key={child.studentProfileId} child={child} />
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
}: {
  child: ChildSummary;
  /** Tablet mode only — highlights the card and calls `onPress` instead of navigating. */
  selected?: boolean;
  onPress?: () => void;
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
