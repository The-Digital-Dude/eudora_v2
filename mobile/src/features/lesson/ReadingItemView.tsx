import React from 'react';
import { View } from 'react-native';

import type { ModuleItem } from '@/core/contracts';
import { useUpdateModuleItemProgressMutation } from '@/features/catalog/catalogApi';
import { LockedItemNotice } from '@/features/lesson/LockedItemNotice';
import { Button } from '@/ui/primitives/Button';
import { MathText } from '@/ui/primitives/MathText';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface ReadingItemViewProps {
  item: ModuleItem;
  courseId: string;
}

/**
 * Matches the web ReadingView: no auto-complete-on-scroll, a single explicit
 * "Mark as complete" button.
 *
 * No query of its own to skip when locked — `readingContent` is already
 * nulled server-side on the same `getCourseDetail` response this item came
 * from (`catalog.service.ts`). Rendering `null ?? ''` as an empty page used
 * to be indistinguishable from a genuinely empty item; checking
 * `isContentLocked` first is what tells the two apart.
 */
export function ReadingItemView({ item, courseId }: ReadingItemViewProps) {
  const t = useTheme();
  const [updateProgress, { isLoading }] = useUpdateModuleItemProgressMutation();

  if (item.isContentLocked) {
    return <LockedItemNotice courseId={courseId} what="reading" />;
  }

  return (
    <View>
      <MathText variant="body">{item.readingContent ?? ''}</MathText>
      <View style={{ height: t.spacing.xl }} />
      <Button
        title={item.isDone ? 'Completed' : 'Mark as complete'}
        onPress={() => updateProgress({ id: item.id, completed: true })}
        loading={isLoading}
        disabled={item.isDone}
        variant={item.isDone ? 'secondary' : 'primary'}
        fullWidth
      />
    </View>
  );
}
