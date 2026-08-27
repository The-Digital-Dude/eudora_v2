import { CheckCircle2, Circle, Flame, Gem, Star } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import {
  useGetChildAttendanceQuery,
  useGetChildGradebookSummaryQuery,
  useGetChildGradesQuery,
  useGetChildHomeworkQuery,
  useGetChildLearningQuery,
  useGetChildTeachersQuery,
} from './guardianApi';

interface ChildDetailPanelProps {
  studentProfileId: string;
}

/**
 * The content of a child's drill-down — learning stats, homework, grades,
 * attendance, teachers. Shared between the phone route
 * (`app/guardian/[studentProfileId].tsx`, which wraps this with a Back
 * header) and the tablet two-pane layout in `GuardianHomeScreen` (which
 * renders this directly as the right-hand detail pane).
 */
export function ChildDetailPanel({ studentProfileId }: ChildDetailPanelProps) {
  const t = useTheme();

  const { data: learning, isLoading: loadingLearning } = useGetChildLearningQuery(
    studentProfileId,
  );
  const { data: teachers } = useGetChildTeachersQuery(studentProfileId);
  const { data: attendance } = useGetChildAttendanceQuery(studentProfileId);
  const { data: homework } = useGetChildHomeworkQuery(studentProfileId);
  const { data: grades } = useGetChildGradesQuery(studentProfileId);
  const { data: gradebookSummary } = useGetChildGradebookSummaryQuery(studentProfileId);

  return (
    <View>
      <Text variant="title">Learning activity</Text>
      <View style={{ height: t.spacing.xl }} />

      {loadingLearning || !learning ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
            <StatTile
              icon={<Flame size={20} color={t.colors.warning} />}
              value={String(learning.currentStreak)}
              label="day streak"
            />
            <StatTile
              icon={<Star size={20} color={t.colors.primary} />}
              value={String(learning.totalXp)}
              label="total XP"
            />
            <StatTile
              icon={<Gem size={20} color={t.colors.success} />}
              value={String(learning.level)}
              label="level"
            />
          </View>
        </>
      )}

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Homework</Text>
      <View style={{ height: t.spacing.md }} />
      {!homework || homework.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No homework assigned yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {homework.map((hw) => (
            <Card
              key={hw.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
            >
              {hw.submission ? (
                <CheckCircle2 size={18} color={t.colors.success} />
              ) : (
                <Circle size={18} color={t.colors.mutedForeground} />
              )}
              <View style={{ flex: 1 }}>
                <Text variant="body">{hw.title}</Text>
                <Text variant="caption" color="mutedForeground">
                  {hw.courseName} · due {new Date(hw.dueDate).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Grades</Text>
      <View style={{ height: t.spacing.md }} />
      {gradebookSummary && gradebookSummary.termAverage != null ? (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="mutedForeground">
                Term average
              </Text>
              <Text variant="title">{gradebookSummary.termAverage}%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" color="mutedForeground">
                Letter grade
              </Text>
              <Text variant="heading">{gradebookSummary.letterGrade}</Text>
            </View>
            {gradebookSummary.classPercentile != null ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color="mutedForeground">
                  Percentile
                </Text>
                <Text variant="heading">{Math.round(gradebookSummary.classPercentile)}</Text>
              </View>
            ) : null}
          </Card>
          <View style={{ height: t.spacing.md }} />
        </>
      ) : null}
      {!grades || grades.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No published grades yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {grades.map((g) => (
            <Card key={g.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="body">{g.title}</Text>
                <Text variant="caption" color="mutedForeground">
                  {g.batch?.name ?? g.category}
                </Text>
              </View>
              <Text variant="label" color="primary">
                {g.percentage != null ? `${Math.round(g.percentage)}%` : '—'}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Attendance</Text>
      <View style={{ height: t.spacing.md }} />
      {!attendance || attendance.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No attendance records yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {attendance.slice(0, 10).map((a) => (
            <Card key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body">{new Date(a.date).toLocaleDateString()}</Text>
              <Text
                variant="label"
                color={
                  a.status === 'PRESENT'
                    ? 'success'
                    : a.status === 'ABSENT'
                      ? 'destructive'
                      : 'warning'
                }
              >
                {a.status}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Teachers</Text>
      <View style={{ height: t.spacing.md }} />
      {!teachers || teachers.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No teachers assigned yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {teachers.map((teacher) => (
            <Card key={teacher.id}>
              <Text variant="body">
                {teacher.firstName} {teacher.lastName}
              </Text>
              {teacher.specialization ? (
                <Text variant="caption" color="mutedForeground">
                  {teacher.specialization}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: t.spacing.lg }}>
      {icon}
      <Text variant="heading" style={{ marginTop: t.spacing.xs }}>
        {value}
      </Text>
      <Text variant="caption" color="mutedForeground" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}
