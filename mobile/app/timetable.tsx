import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TimetableSlot } from '@/core/contracts';
import { useGetMeQuery } from '@/features/auth/authApi';
import { useGetStudentScheduleQuery } from '@/features/timetable/timetableApi';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function titleCase(day: string) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

/**
 * Student's own schedule when reached with no param (home-screen nav);
 * a specific child's schedule when reached with `?studentProfileId=` from
 * ChildDetailPanel — same screen, same query, no ownership logic needed
 * client-side since the backend permission gate covers both cases today.
 */
export default function TimetableScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { studentProfileId: paramId, name } = useLocalSearchParams<{
    studentProfileId?: string;
    name?: string;
  }>();

  const { data: me } = useGetMeQuery();
  const studentProfileId = paramId || me?.studentProfile?.id;

  const { data: slots, isLoading } = useGetStudentScheduleQuery(studentProfileId!, {
    skip: !studentProfileId,
  });

  const byDay = new Map<string, TimetableSlot[]>();
  for (const slot of slots ?? []) {
    if (!byDay.has(slot.dayOfWeek)) byDay.set(slot.dayOfWeek, []);
    byDay.get(slot.dayOfWeek)!.push(slot);
  }
  const days = DAY_ORDER.filter((d) => byDay.has(d));

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

      <Text variant="title">{name ? `${name}'s Schedule` : 'Schedule'}</Text>
      <View style={{ height: t.spacing.xl }} />

      {isLoading ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : days.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No published schedule yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.xl }}>
          {days.map((day) => (
            <View key={day}>
              <Text variant="heading">{titleCase(day)}</Text>
              <View style={{ height: t.spacing.md }} />
              <View style={{ gap: t.spacing.sm }}>
                {byDay
                  .get(day)!
                  .sort((a, b) => a.startTimeMinutes - b.startTimeMinutes)
                  .map((slot) => (
                    <Card key={slot.id}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm }}>
                        <Text variant="label" style={{ flex: 1 }}>
                          {slot.courseClass?.name ?? 'Study period'}
                        </Text>
                        <Text
                          variant="caption"
                          color="mutedForeground"
                          style={{ flexShrink: 0, textAlign: 'right' }}
                        >
                          {formatMinutes(slot.startTimeMinutes)} – {formatMinutes(slot.endTimeMinutes)}
                        </Text>
                      </View>
                      {slot.teacherProfile || slot.room ? (
                        <>
                          <View style={{ height: t.spacing.xs }} />
                          <Text variant="caption" color="mutedForeground">
                            {[slot.teacherProfile?.fullName, slot.room ? `Room ${slot.room}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </>
                      ) : null}
                    </Card>
                  ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
