import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface LockedItemNoticeProps {
  courseId: string;
  /** e.g. "video", "checkpoint", "class schedule" — fits "Unlock this course to see the {what}." */
  what: string;
}

/**
 * Shown instead of a kind's real view whenever `item.isContentLocked`.
 *
 * Every consumption route (`my-homework`, `my-session`, `discussion`,
 * `my-assignment`) 403s for a locked item — the server enforces this
 * independent of what the client shows — so skipping the query when locked
 * (every item view does, via each query's `skip` option) isn't optional
 * politeness, it avoids surfacing that 403 as an unhandled error state. This
 * component is what renders in its place.
 */
export function LockedItemNotice({ courseId, what }: LockedItemNoticeProps) {
  const t = useTheme();
  const router = useRouter();

  return (
    <Card style={{ alignItems: 'center', paddingVertical: t.spacing.xl }}>
      <Lock size={28} color={t.colors.mutedForeground} />
      <View style={{ height: t.spacing.sm }} />
      <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
        Unlock this course to see the {what}.
      </Text>
      <View style={{ height: t.spacing.lg }} />
      <Button
        title="Unlock this course"
        onPress={() =>
          router.push({
            pathname: '/course/[courseId]/unlock',
            params: { courseId },
          })
        }
      />
    </Card>
  );
}
