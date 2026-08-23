import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssessmentItemView } from '@/features/assessment/AssessmentItemView';
import { useGetCourseDetailQuery } from '@/features/catalog/catalogApi';
import { useActingChild } from '@/features/guardian/useActingChild';
import { DiscussionItemView } from '@/features/lesson/DiscussionItemView';
import { ReadingItemView } from '@/features/lesson/ReadingItemView';
import { VideoItemView } from '@/features/lesson/VideoItemView';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * There is no `GET /catalog/module-items/:id` endpoint — a ModuleItem's full
 * data only exists nested in `GET /catalog/courses/:id`. Rather than thread
 * the item's fields through navigation params, this re-reads the already-
 * cached course-detail query (an instant cache hit — the outline screen just
 * fetched it) and finds the item by id.
 */
export default function ModuleItemScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { courseId, itemId } = useLocalSearchParams<{
    courseId: string;
    itemId: string;
  }>();

  const { actingChildId } = useActingChild();
  const { data: course, isLoading } = useGetCourseDetailQuery(
    { courseId: courseId!, actingChildId },
    { skip: !courseId },
  );

  const item = course?.concepts
    .flatMap((c) => c.items)
    .find((i) => i.id === itemId);

  if (isLoading || !course) {
    return (
      <View style={centered(t.colors.background)}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={centered(t.colors.background)}>
        <Text variant="body" color="mutedForeground">
          This item couldn&apos;t be found.
        </Text>
      </View>
    );
  }

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

      <Text variant="title">{item.title}</Text>
      <View style={{ height: t.spacing.xl }} />

      {item.kind === 'VIDEO' ? (
        <VideoItemView item={item} />
      ) : item.kind === 'READING' ? (
        <ReadingItemView item={item} />
      ) : item.kind === 'DISCUSSION' ? (
        <DiscussionItemView item={item} />
      ) : (
        <AssessmentItemView item={item} />
      )}
    </ScrollView>
  );
}

function centered(background: string) {
  return {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: background,
  };
}
