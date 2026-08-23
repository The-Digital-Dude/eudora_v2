import { useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useGetCoursesQuery,
  useGetEntitlementsMeQuery,
  useGetSubjectsQuery,
} from '@/features/catalog/catalogApi';
import { formatCents } from '@/features/billing/format';
import { useActingChild } from '@/features/guardian/useActingChild';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

const GRADE_BAND_LABELS: Record<string, string> = {
  PRE_K_K: 'Pre-K/K',
  G1_2: 'Grades 1-2',
  G3_4: 'Grades 3-4',
  G5_6: 'Grades 5-6',
};

const GRADE_BAND_ORDER = ['PRE_K_K', 'G1_2', 'G3_4', 'G5_6'] as const;

export default function CourseBrowseScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [gradeBand, setGradeBand] = useState<string | null>(null);

  const { data: subjects } = useGetSubjectsQuery();
  const { actingChildId } = useActingChild();
  const { data: courses, isLoading } = useGetCoursesQuery({
    actingChildId,
    ...(subjectId ? { subjectId } : {}),
  });
  // Cheap set-membership check for badging cards — full `isEntitled` /
  // `isContentLocked` detail only exists once a course is actually opened
  // (`getCourseDetail`), and fetching that per card would be a query per row.
  const { data: entitlements } = useGetEntitlementsMeQuery({ actingChildId });
  const ownedCourseIds = entitlements?.courseIds ?? [];

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (gradeBand && course.gradeBand !== gradeBand) return false;
      if (q && !course.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [courses, query, gradeBand]);

  const inputStyle = {
    backgroundColor: t.colors.card,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    fontSize: t.fontSize.md,
    color: t.colors.foreground,
  };

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

      <Text variant="title">Browse courses</Text>
      <View style={{ height: t.spacing.lg }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
        <Search size={18} color={t.colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search courses…"
          placeholderTextColor={t.colors.mutedForeground}
          style={[inputStyle, { flex: 1 }]}
        />
      </View>

      <View style={{ height: t.spacing.lg }} />

      {subjects && subjects.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: t.spacing.sm }}
        >
          <FilterChip
            label="All subjects"
            active={subjectId === null}
            onPress={() => setSubjectId(null)}
          />
          {subjects.map((subject) => (
            <FilterChip
              key={subject.id}
              label={subject.name}
              active={subjectId === subject.id}
              onPress={() => setSubjectId(subject.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ height: t.spacing.sm }} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.spacing.sm }}
      >
        <FilterChip
          label="All grades"
          active={gradeBand === null}
          onPress={() => setGradeBand(null)}
        />
        {GRADE_BAND_ORDER.map((band) => (
          <FilterChip
            key={band}
            label={GRADE_BAND_LABELS[band]}
            active={gradeBand === band}
            onPress={() => setGradeBand(band)}
          />
        ))}
      </ScrollView>

      <View style={{ height: t.spacing.xl }} />

      {isLoading ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : filtered.length > 0 ? (
        <View style={{ gap: t.spacing.md }}>
          {filtered.map((course) => (
            <Pressable
              key={course.id}
              onPress={() => router.push(`/course/${course.id}`)}
              accessibilityRole="button"
            >
              <Card style={{ flexDirection: 'row', gap: t.spacing.md }}>
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
                <View style={{ flex: 1 }}>
                  <Text variant="label" numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                    {course.learningSubject.name} · {course._count.concepts} chapters
                  </Text>
                  {course.gradeBand ? (
                    <>
                      <View style={{ height: t.spacing.xs }} />
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
                </View>
                <OwnershipBadge
                  owned={ownedCourseIds.includes(course.id)}
                  priceCents={course.priceOneTimeCents}
                  currency={course.currency}
                />
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <Text variant="body" color="mutedForeground">
            No courses match your filters.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

/**
 * Owned takes priority over price when both are somehow true (shouldn't
 * happen — an owned course wouldn't normally still carry a price to show —
 * but ownership is the more important fact if it ever does). Neither badge
 * renders for a bundle-only course (`priceCents === null`, not owned): there
 * is nothing accurate to say about it from the list alone.
 */
function OwnershipBadge({
  owned,
  priceCents,
  currency,
}: {
  owned: boolean;
  priceCents: number | null;
  currency: string;
}) {
  if (owned) {
    return (
      <Text variant="caption" color="success">
        Owned
      </Text>
    );
  }
  if (priceCents == null) return null;
  return (
    <Text variant="label" color="primary">
      {formatCents(priceCents, currency)}
    </Text>
  );
}

function FilterChip({
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
    <Pressable onPress={onPress} accessibilityRole="button">
      <View
        style={{
          paddingHorizontal: t.spacing.lg,
          paddingVertical: t.spacing.sm,
          borderRadius: t.radius.pill,
          backgroundColor: active ? t.colors.primary : t.colors.card,
          borderWidth: 1,
          borderColor: active ? t.colors.primary : t.colors.border,
        }}
      >
        <Text
          variant="caption"
          style={{ color: active ? t.colors.primaryForeground : t.colors.foreground }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
