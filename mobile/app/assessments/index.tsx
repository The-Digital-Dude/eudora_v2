import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AssignmentSummary, AttemptSummary } from '@/core/contracts';
import { useGetMeQuery } from '@/features/auth/authApi';
import { useGetStudentAssignmentsQuery, useGetStudentAttemptsQuery } from '@/features/assessment/assessmentApi';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/** Browse "what's due" and past results — the existing player is still reached by tapping an assignment. */
export default function AssessmentsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: me } = useGetMeQuery();
  const studentProfileId = me?.studentProfile?.id;

  const { data: assignments, isLoading: loadingAssignments } = useGetStudentAssignmentsQuery(
    studentProfileId!,
    { skip: !studentProfileId },
  );
  const { data: attempts, isLoading: loadingAttempts } = useGetStudentAttemptsQuery(studentProfileId!, {
    skip: !studentProfileId,
  });

  // Attempts only carry `assessmentAssignmentId`, not the assessment title —
  // both queries are already loaded on this screen, so cross-reference here
  // rather than adding a second round trip.
  const assignmentById = new Map((assignments?.items ?? []).map((a) => [a.id, a]));

  const upcoming = (assignments?.items ?? []).filter(
    (a) => a.status === 'assigned' || a.status === 'started' || a.status === 'overdue',
  );

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

      <Text variant="title">Assessments</Text>
      <View style={{ height: t.spacing.xl }} />

      <Text variant="heading">Due</Text>
      <View style={{ height: t.spacing.md }} />
      {loadingAssignments ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : upcoming.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            Nothing due — you're all caught up.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {upcoming.map((a) => (
            <AssignmentRow key={a.id} assignment={a} />
          ))}
        </View>
      )}

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Past results</Text>
      <View style={{ height: t.spacing.md }} />
      {loadingAttempts ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : !attempts || attempts.items.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No completed attempts yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {attempts.items.map((attempt) => (
            <AttemptRow
              key={attempt.id}
              attempt={attempt}
              title={assignmentById.get(attempt.assessmentAssignmentId)?.assessment.title}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function AssignmentRow({ assignment }: { assignment: AssignmentSummary }) {
  const t = useTheme();
  const router = useRouter();
  const overdue = assignment.status === 'overdue';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/assessment/[assignmentId]', params: { assignmentId: assignment.id } })}
      accessibilityRole="button"
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="label">{assignment.assessment.title}</Text>
            {assignment.classSection ? (
              <Text variant="caption" color="mutedForeground">
                {assignment.classSection.name}
              </Text>
            ) : null}
            {assignment.dueAt ? (
              <>
                <View style={{ height: t.spacing.xs }} />
                <Text variant="caption" color={overdue ? 'destructive' : 'mutedForeground'}>
                  Due {new Date(assignment.dueAt).toLocaleDateString()}
                </Text>
              </>
            ) : null}
          </View>
          <ChevronRight size={18} color={t.colors.mutedForeground} />
        </View>
      </Card>
    </Pressable>
  );
}

function AttemptRow({ attempt, title }: { attempt: AttemptSummary; title?: string }) {
  const t = useTheme();
  const graded = attempt.resultStatus === 'marked';

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="label" style={{ flex: 1 }}>
          {title ?? 'Assessment'}
        </Text>
        <Text variant="caption" color={graded ? 'success' : 'mutedForeground'}>
          {attempt.resultStatus.replace(/_/g, ' ')}
        </Text>
      </View>
      <View style={{ height: t.spacing.xs }} />
      <Text variant="caption" color="mutedForeground">
        Attempt {attempt.attemptNumber} ·{' '}
        {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'In progress'}
      </Text>
      {attempt.percentageScore != null ? (
        <>
          <View style={{ height: t.spacing.sm }} />
          <Text variant="body">
            {attempt.rawScore} / {attempt.maxScore} pts ({Math.round(attempt.percentageScore)}%)
          </Text>
        </>
      ) : null}
    </Card>
  );
}
