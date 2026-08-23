import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HomeworkSubmissionRecord, PendingHomeworkItem } from '@/core/contracts';
import { useActingChild } from '@/features/guardian/useActingChild';
import { batchLabel, dueLabel, isOverdue } from '@/features/homework/format';
import { useGetPendingHomeworkQuery, useGetMySubmissionsQuery } from '@/features/homework/homeworkApi';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function HomeworkScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Resolves to the acting child for a guardian and to the caller's own
  // profile for a student, so both audiences read the same endpoints.
  const { learnerId } = useActingChild();

  const { data: pending, isLoading: loadingPending, isFetching, refetch: refetchPending } =
    useGetPendingHomeworkQuery(learnerId!, { skip: !learnerId });
  const { data: submissions, isLoading: loadingSubmissions, refetch: refetchSubmissions } =
    useGetMySubmissionsQuery(learnerId!, { skip: !learnerId });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      contentContainerStyle={{
        padding: t.spacing.xl,
        paddingTop: insets.top + t.spacing.md,
        paddingBottom: insets.bottom + t.spacing.xxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => {
            void refetchPending();
            void refetchSubmissions();
          }}
          tintColor={t.colors.primary}
        />
      }
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

      <Text variant="title">Homework</Text>
      <View style={{ height: t.spacing.xl }} />

      <Text variant="heading">Due</Text>
      <View style={{ height: t.spacing.md }} />
      {loadingPending ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : !pending || pending.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            Nothing due — you're all caught up.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {pending.map((hw) => (
            <PendingRow key={hw.id} homework={hw} />
          ))}
        </View>
      )}

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Submitted</Text>
      <View style={{ height: t.spacing.md }} />
      {loadingSubmissions ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : !submissions || submissions.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No submissions yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {submissions.map((s) => (
            <SubmissionRow key={s.id} submission={s} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function PendingRow({ homework }: { homework: PendingHomeworkItem }) {
  const t = useTheme();
  const router = useRouter();
  const overdue = isOverdue(homework.dueDate);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/homework/[homeworkId]', params: { homeworkId: homework.id } })}
      accessibilityRole="button"
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="label">{homework.title}</Text>
            <Text variant="caption" color="mutedForeground">
              {batchLabel(homework.batch)} · {homework.maxPoints} pts
            </Text>
            <View style={{ height: t.spacing.xs }} />
            <Text variant="caption" color={overdue ? 'destructive' : 'mutedForeground'}>
              {dueLabel(homework.dueDate)}
            </Text>
          </View>
          <ChevronRight size={18} color={t.colors.mutedForeground} />
        </View>
      </Card>
    </Pressable>
  );
}

function SubmissionRow({ submission }: { submission: HomeworkSubmissionRecord }) {
  const t = useTheme();
  const graded = submission.status === 'GRADED';

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="label" style={{ flex: 1 }}>
          {submission.homework.title}
        </Text>
        <Text
          variant="caption"
          color={
            submission.status === 'LATE'
              ? 'warning'
              : graded
                ? 'success'
                : 'mutedForeground'
          }
        >
          {submission.status}
        </Text>
      </View>
      <View style={{ height: t.spacing.xs }} />
      <Text variant="caption" color="mutedForeground">
        {batchLabel(submission.homework.batch)}
      </Text>
      {graded ? (
        <>
          <View style={{ height: t.spacing.sm }} />
          <Text variant="body">
            {submission.pointsEarned} / {submission.homework.maxPoints} pts
          </Text>
          {submission.feedback ? (
            <>
              <View style={{ height: t.spacing.xs }} />
              <Text variant="caption" color="mutedForeground">
                {submission.feedback}
              </Text>
            </>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
