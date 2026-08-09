import { useRouter } from 'expo-router';
import { ArrowLeftRight, Award, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Flame, Gem, Settings, Star, Trophy } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetMeQuery } from '@/features/auth/authApi';
import { useGetCoursesQuery } from '@/features/catalog/catalogApi';
import { useGetGamificationMeQuery } from '@/features/gamification/gamificationApi';
import { useGetMyPendingHomeworkQuery } from '@/features/homework/homeworkApi';
import { TodaysGoals } from '@/features/gamification/TodaysGoals';
import { Card } from '@/ui/primitives/Card';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface StudentHomeScreenProps {
  /** Only passed by `app/index.tsx` when the account also has a GuardianProfile. */
  onSwitchToGuardian?: () => void;
}

export function StudentHomeScreen({ onSwitchToGuardian }: StudentHomeScreenProps = {}) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: me } = useGetMeQuery();
  const {
    data: gamification,
    isLoading: loadingXp,
    refetch: refetchXp,
    isFetching,
  } = useGetGamificationMeQuery();
  const { data: courses, refetch: refetchCourses } = useGetCoursesQuery();
  const { data: pendingHomework } = useGetMyPendingHomeworkQuery();

  const xp = gamification?.experience;
  const streak = gamification?.streak;
  const levelProgress =
    xp && xp.nextLevelXp > 0 ? (xp.totalXp % xp.nextLevelXp) / xp.nextLevelXp : 0;

  if (loadingXp) {
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
          onRefresh={() => {
            void refetchXp();
            void refetchCourses();
          }}
          tintColor={t.colors.primary}
        />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Text variant="caption" color="mutedForeground">
            {greeting()}
          </Text>
          <Text variant="title">
            {me?.firstName || me?.email || 'Learner'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
          {onSwitchToGuardian ? (
            <Pressable
              onPress={onSwitchToGuardian}
              accessibilityRole="button"
              accessibilityLabel="Switch to guardian view"
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

      {/* Streak / XP / level */}
      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        <StatTile
          icon={<Flame size={20} color={t.colors.warning} />}
          value={String(streak?.currentStreak ?? 0)}
          label="day streak"
        />
        <StatTile
          icon={<Star size={20} color={t.colors.primary} />}
          value={String(xp?.totalXp ?? 0)}
          label="total XP"
        />
        <StatTile
          icon={<Gem size={20} color={t.colors.success} />}
          value={String(xp?.level ?? 1)}
          label="level"
        />
      </View>

      <View style={{ height: t.spacing.lg }} />

      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        <Pressable
          onPress={() => router.push('/badges')}
          accessibilityRole="button"
          style={{ flex: 1 }}
        >
          <Card
            style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
          >
            <Award size={18} color={t.colors.primary} />
            <Text variant="label">Badges</Text>
          </Card>
        </Pressable>
        <Pressable
          onPress={() => router.push('/leaderboard')}
          accessibilityRole="button"
          style={{ flex: 1 }}
        >
          <Card
            style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
          >
            <Trophy size={18} color={t.colors.primary} />
            <Text variant="label">Leaderboard</Text>
          </Card>
        </Pressable>
      </View>

      <View style={{ height: t.spacing.md }} />

      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        <Pressable onPress={() => router.push('/homework')} accessibilityRole="button" style={{ flex: 1 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <ClipboardList size={18} color={t.colors.primary} />
            <Text variant="label" style={{ flex: 1 }}>
              Homework
            </Text>
            {pendingHomework && pendingHomework.length > 0 ? (
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
                  {pendingHomework.length}
                </Text>
              </View>
            ) : null}
          </Card>
        </Pressable>
        <Pressable onPress={() => router.push('/timetable')} accessibilityRole="button" style={{ flex: 1 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <CalendarDays size={18} color={t.colors.primary} />
            <Text variant="label">Schedule</Text>
          </Card>
        </Pressable>
      </View>

      <View style={{ height: t.spacing.md }} />

      <Pressable onPress={() => router.push('/assessments')} accessibilityRole="button">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <ClipboardCheck size={18} color={t.colors.primary} />
          <Text variant="label">Assessments</Text>
        </Card>
      </Pressable>

      <View style={{ height: t.spacing.lg }} />

      <Card>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: t.spacing.sm,
          }}
        >
          <Text variant="label">Level {xp?.level ?? 1}</Text>
          <Text variant="caption" color="mutedForeground">
            {xp?.totalXp ?? 0} / {xp?.nextLevelXp ?? 100} XP
          </Text>
        </View>
        <ProgressBar value={levelProgress} />
      </Card>

      <View style={{ height: t.spacing.xl }} />

      <TodaysGoals />

      <View style={{ height: t.spacing.xl }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="heading">Your courses</Text>
        <Pressable onPress={() => router.push('/course')} accessibilityRole="button" hitSlop={8}>
          <Text variant="caption" color="primary">
            Browse all
          </Text>
        </Pressable>
      </View>
      <View style={{ height: t.spacing.md }} />

      {courses && courses.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: t.spacing.md, paddingRight: t.spacing.xl }}
        >
          {courses.map((course) => (
            <Pressable
              key={course.id}
              onPress={() => router.push(`/course/${course.id}`)}
              accessibilityRole="button"
            >
              <Card style={{ width: 200 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: t.radius.md,
                    backgroundColor: t.colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookOpen size={22} color={t.colors.accentForeground} />
                </View>
                <View style={{ height: t.spacing.sm }} />
                <Text variant="label" numberOfLines={2}>
                  {course.title}
                </Text>
                <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                  {course.learningSubject.name} · {course._count.concepts} chapters
                </Text>
                {course.gradeBand ? (
                  <>
                    <View style={{ height: t.spacing.sm }} />
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        paddingHorizontal: t.spacing.sm,
                        paddingVertical: 2,
                        borderRadius: t.radius.pill,
                        backgroundColor: t.colors.muted,
                      }}
                    >
                      <Text variant="caption" color="mutedForeground">
                        {GRADE_BAND_LABELS[course.gradeBand]}
                      </Text>
                    </View>
                  </>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Card>
          <Text variant="body" color="mutedForeground">
            No courses are available yet.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const GRADE_BAND_LABELS: Record<string, string> = {
  PRE_K_K: 'Pre-K/K',
  G1_2: 'Grades 1-2',
  G3_4: 'Grades 3-4',
  G5_6: 'Grades 5-6',
};

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: t.spacing.lg }}>
      {icon}
      <Text variant="heading" style={{ marginTop: t.spacing.xs }}>
        {value}
      </Text>
      <Text variant="caption" color="mutedForeground" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
