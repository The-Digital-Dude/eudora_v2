import React from 'react';
import { View } from 'react-native';

import type { ModuleItem } from '@/core/contracts';
import { useUpdateModuleItemProgressMutation } from '@/features/catalog/catalogApi';
import { Button } from '@/ui/primitives/Button';
import { MathText } from '@/ui/primitives/MathText';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface ReadingItemViewProps {
  item: ModuleItem;
}

/**
 * Matches the web ReadingView: no auto-complete-on-scroll, a single explicit
 * "Mark as complete" button.
 */
export function ReadingItemView({ item }: ReadingItemViewProps) {
  const t = useTheme();
  const [updateProgress, { isLoading }] = useUpdateModuleItemProgressMutation();

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
