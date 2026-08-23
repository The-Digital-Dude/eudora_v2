import { CalendarClock, User, VideoOff } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import type { LiveSessionUnavailableReason, ModuleItem } from '@/core/contracts';
import { useGetMySessionForItemQuery } from '@/features/catalog/catalogApi';
import { useActingChild } from '@/features/guardian/useActingChild';
import { LockedItemNotice } from '@/features/lesson/LockedItemNotice';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface LiveClassItemViewProps {
  item: ModuleItem;
  courseId: string;
}

const REASON_COPY: Record<LiveSessionUnavailableReason, string> = {
  // Staff previewing a LIVE course, not the learner audience this screen is
  // built for — worth a distinct message so it doesn't read as a bug report.
  NOT_A_STUDENT: 'Sign in as the learner to see this class’s meeting time.',
  NOT_IN_A_BATCH: 'You’re not enrolled in a cohort for this course yet.',
  NOT_SCHEDULED: 'This class hasn’t been scheduled yet. Check back soon.',
};

/**
 * The LIVE_CLASS module-item kind. One item resolves to a different
 * `BatchSession` per cohort — the date, join link and teacher all live on the
 * session, never on the item — so this always goes through
 * `GET .../my-session` rather than reading anything off `item` itself.
 */
export function LiveClassItemView({ item, courseId }: LiveClassItemViewProps) {
  const t = useTheme();
  const { actingChildId } = useActingChild();

  const { data, isLoading, isError } = useGetMySessionForItemQuery(
    { moduleItemId: item.id, actingChildId },
    // Locked items 403 on this route too; same reasoning as HomeworkItemView.
    { skip: item.isContentLocked },
  );

  if (item.isContentLocked) {
    return <LockedItemNotice courseId={courseId} what="class schedule" />;
  }

  if (isLoading) {
    return <ActivityIndicator color={t.colors.primary} />;
  }

  if (isError || !data) {
    return (
      <Card>
        <Text variant="body" color="mutedForeground">
          Couldn&apos;t load this class. Pull to refresh and try again.
        </Text>
      </Card>
    );
  }

  if (!data.session) {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
        <VideoOff size={20} color={t.colors.mutedForeground} />
        <Text variant="body" color="mutedForeground" style={{ flex: 1 }}>
          {REASON_COPY[data.reason ?? 'NOT_SCHEDULED']}
        </Text>
      </Card>
    );
  }

  const { session } = data;
  const cancelled = Boolean(session.cancelledAt) || session.status === 'CANCELLED';
  const teacherName = session.teacher
    ? `${session.teacher.firstName} ${session.teacher.lastName}`
    : null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
        <CalendarClock size={18} color={t.colors.primary} />
        <Text variant="label" style={{ flex: 1 }}>
          {session.topic || item.title}
        </Text>
        <StatusBadge status={cancelled ? 'CANCELLED' : session.status} />
      </View>

      <View style={{ height: t.spacing.md }} />
      <Text variant="body">{formatSessionTime(session.date, session.startTime, session.endTime)}</Text>

      {teacherName ? (
        <>
          <View style={{ height: t.spacing.xs }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}>
            <User size={14} color={t.colors.mutedForeground} />
            <Text variant="caption" color="mutedForeground">
              {teacherName} · {session.batch.name}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={{ height: t.spacing.xs }} />
          <Text variant="caption" color="mutedForeground">
            {session.batch.name}
          </Text>
        </>
      )}

      <View style={{ height: t.spacing.lg }} />
      {cancelled ? (
        <Text variant="label" color="destructive">
          This class was cancelled.
        </Text>
      ) : session.joinUrl ? (
        <Button
          title="Join class"
          onPress={() => void Linking.openURL(session.joinUrl!)}
          fullWidth
        />
      ) : (
        // `provider` stays NONE until the meeting integration lands, so a
        // scheduled session routinely has no link yet — not a broken one.
        <Text variant="caption" color="mutedForeground">
          The join link isn&apos;t ready yet. Check back closer to class time.
        </Text>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED' }) {
  const { label, color } = {
    SCHEDULED: { label: 'Scheduled', color: 'mutedForeground' as const },
    LIVE: { label: 'Live now', color: 'success' as const },
    ENDED: { label: 'Ended', color: 'mutedForeground' as const },
    CANCELLED: { label: 'Cancelled', color: 'destructive' as const },
  }[status];

  return (
    <Text variant="caption" color={color}>
      {label}
    </Text>
  );
}

function formatSessionTime(
  date: string,
  startTime: string | null,
  endTime: string | null,
): string {
  const day = new Date(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  if (!startTime) return day;

  const start = new Date(startTime).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!endTime) return `${day} · ${start}`;

  const end = new Date(endTime).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day} · ${start}–${end}`;
}
