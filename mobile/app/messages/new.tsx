import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetChildTeachersQuery, useGetChildrenQuery } from '@/features/guardian/guardianApi';
import { useCreateThreadMutation } from '@/features/messaging/messagingApi';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function NewThreadScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: children, isLoading: loadingChildren } = useGetChildrenQuery();
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const { data: teachers, isLoading: loadingTeachers } = useGetChildTeachersQuery(studentProfileId!, {
    skip: !studentProfileId,
  });
  const [teacherUserId, setTeacherUserId] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [firstMessageBody, setFirstMessageBody] = useState('');
  const [error, setError] = useState('');
  const [createThread, { isLoading: creating }] = useCreateThreadMutation();

  const inputStyle = {
    backgroundColor: t.colors.card,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
    fontSize: t.fontSize.md,
    color: t.colors.foreground,
    minHeight: 52,
  };

  const handleSubmit = async () => {
    if (!studentProfileId) {
      setError('Select a child.');
      return;
    }
    if (!teacherUserId) {
      setError('Select a teacher.');
      return;
    }
    if (!subject.trim() || !firstMessageBody.trim()) {
      setError('Enter a subject and a message.');
      return;
    }
    setError('');
    try {
      const thread = await createThread({
        studentProfileId,
        teacherUserId,
        subject: subject.trim(),
        firstMessageBody: firstMessageBody.trim(),
      }).unwrap();
      router.replace({ pathname: '/messages/[threadId]', params: { threadId: thread.id } });
    } catch (err: any) {
      setError(err?.data?.message || 'Could not start the conversation.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: t.spacing.xl,
          paddingTop: insets.top + t.spacing.md,
          paddingBottom: insets.bottom + t.spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
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

        <Text variant="title">New message</Text>
        <View style={{ height: t.spacing.xl }} />

        <Text variant="label" color="mutedForeground">
          Regarding
        </Text>
        <View style={{ height: t.spacing.sm }} />
        {loadingChildren ? (
          <ActivityIndicator color={t.colors.primary} />
        ) : !children || children.length === 0 ? (
          <Card>
            <Text variant="body" color="mutedForeground">
              No students linked to your account yet.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: t.spacing.sm }}>
            {children.map((child) => (
              <Pressable
                key={child.studentProfileId}
                onPress={() => {
                  setStudentProfileId(child.studentProfileId);
                  setTeacherUserId(null);
                }}
                accessibilityRole="button"
              >
                <Card
                  style={
                    studentProfileId === child.studentProfileId
                      ? { borderColor: t.colors.primary, borderWidth: 2 }
                      : undefined
                  }
                >
                  <Text variant="label">{child.fullName}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {studentProfileId ? (
          <>
            <View style={{ height: t.spacing.xl }} />
            <Text variant="label" color="mutedForeground">
              Teacher
            </Text>
            <View style={{ height: t.spacing.sm }} />
            {loadingTeachers ? (
              <ActivityIndicator color={t.colors.primary} />
            ) : !teachers || teachers.length === 0 ? (
              <Card>
                <Text variant="body" color="mutedForeground">
                  No teachers found for this student.
                </Text>
              </Card>
            ) : (
              <View style={{ gap: t.spacing.sm }}>
                {teachers.map((teacher) => (
                  <Pressable
                    key={teacher.id}
                    onPress={() => setTeacherUserId(teacher.id)}
                    accessibilityRole="button"
                  >
                    <Card
                      style={
                        teacherUserId === teacher.id
                          ? { borderColor: t.colors.primary, borderWidth: 2 }
                          : undefined
                      }
                    >
                      <Text variant="label">
                        {teacher.firstName} {teacher.lastName}
                      </Text>
                      {teacher.specialization ? (
                        <Text variant="caption" color="mutedForeground">
                          {teacher.specialization}
                        </Text>
                      ) : null}
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : null}

        <View style={{ height: t.spacing.xl }} />
        <Text variant="label" color="mutedForeground">
          Subject
        </Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="What's this about?"
          placeholderTextColor={t.colors.mutedForeground}
          style={[inputStyle, { marginTop: t.spacing.sm }]}
        />

        <View style={{ height: t.spacing.lg }} />
        <Text variant="label" color="mutedForeground">
          Message
        </Text>
        <TextInput
          value={firstMessageBody}
          onChangeText={setFirstMessageBody}
          placeholder="Type your message…"
          placeholderTextColor={t.colors.mutedForeground}
          multiline
          style={[inputStyle, { marginTop: t.spacing.sm, minHeight: 100, textAlignVertical: 'top' }]}
        />

        {error ? (
          <View
            style={{
              marginTop: t.spacing.lg,
              padding: t.spacing.md,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.destructive + '1a',
            }}
          >
            <Text variant="label" color="destructive">
              {error}
            </Text>
          </View>
        ) : null}

        <View style={{ height: t.spacing.xl }} />
        <Button title="Send" onPress={handleSubmit} loading={creating} fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
