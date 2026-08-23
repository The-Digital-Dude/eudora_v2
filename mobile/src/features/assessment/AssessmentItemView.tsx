import { useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { ModuleItem } from '@/core/contracts';
import { useGetMyAssignmentForItemQuery } from '@/features/catalog/catalogApi';
import { useActingChild } from '@/features/guardian/useActingChild';
import { LockedItemNotice } from '@/features/lesson/LockedItemNotice';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface AssessmentItemViewProps {
  item: ModuleItem;
  courseId: string;
}

/**
 * Bridges a module item to its per-student `AssessmentAssignment` (already
 * resolved server-side by `getMyAssignmentForItem`) and hands off to the
 * standalone assessment player. The teacher-assigns-a-class-section workflow
 * that creates the assignment is unchanged/out of scope here.
 */
export function AssessmentItemView({ item, courseId }: AssessmentItemViewProps) {
  const t = useTheme();
  const router = useRouter();
  const { actingChildId } = useActingChild();
  const { data, isLoading } = useGetMyAssignmentForItemQuery(
    { moduleItemId: item.id, actingChildId },
    // `getMyAssignmentForItem` 403s on a locked item, same as every other
    // consumption route.
    { skip: item.isContentLocked },
  );

  if (item.isContentLocked) {
    return <LockedItemNotice courseId={courseId} what="assessment" />;
  }

  if (isLoading || !data) {
    return <ActivityIndicator color={t.colors.primary} />;
  }

  if (!data.assignment) {
    return (
      <Card>
        <Text variant="body" color="mutedForeground">
          No assessment has been assigned to you for this item yet.
        </Text>
      </Card>
    );
  }

  const { assignment } = data;
  const alreadySubmitted = assignment.status === 'submitted';

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
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
        <ClipboardList size={22} color={t.colors.accentForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label">
          {alreadySubmitted ? 'Submitted' : 'Assessment ready'}
        </Text>
        <Text variant="caption" color="mutedForeground">
          Due {new Date(assignment.dueAt).toLocaleDateString()}
        </Text>
      </View>
      <Button
        title={alreadySubmitted ? 'Review' : 'Start'}
        onPress={() =>
          router.push({
            pathname: '/assessment/[assignmentId]',
            params: { assignmentId: assignment.id },
          })
        }
      />
    </Card>
  );
}
