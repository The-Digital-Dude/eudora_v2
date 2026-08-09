import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { useGetMyPendingHomeworkQuery, useSubmitHomeworkMutation } from '@/features/homework/homeworkApi';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function SubmitHomeworkScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { homeworkId } = useLocalSearchParams<{ homeworkId: string }>();

  // Reuses the list screen's cached fetch rather than a dedicated
  // get-by-id endpoint — the pending list is small and RTK Query already
  // has it in cache from `/homework/index.tsx`.
  const { data: pending, isLoading } = useGetMyPendingHomeworkQuery();
  const homework = pending?.find((h) => h.id === homeworkId);

  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitHomework, { isLoading: submitting }] = useSubmitHomeworkMutation();

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Enter your submission before sending.');
      return;
    }
    if (!homeworkId) return;
    setError('');
    try {
      await submitHomework({ homeworkId, content: content.trim() }).unwrap();
      router.back();
    } catch (err: any) {
      setError(err?.data?.message || 'Could not submit homework.');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background }}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

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

        {homework ? (
          <>
            <Text variant="title">{homework.title}</Text>
            <View style={{ height: t.spacing.xs }} />
            <Text variant="caption" color="mutedForeground">
              {homework.courseClass.name} · {homework.maxPoints} pts · Due{' '}
              {new Date(homework.dueDate).toLocaleDateString()}
            </Text>

            {homework.description ? (
              <>
                <View style={{ height: t.spacing.lg }} />
                <Card>
                  <Text variant="body">{homework.description}</Text>
                </Card>
              </>
            ) : null}

            <View style={{ height: t.spacing.xl }} />
            <Text variant="label" color="mutedForeground">
              Your submission
            </Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Type your answer or paste a link to your work…"
              placeholderTextColor={t.colors.mutedForeground}
              multiline
              style={{
                marginTop: t.spacing.sm,
                minHeight: 160,
                textAlignVertical: 'top',
                backgroundColor: t.colors.card,
                borderColor: t.colors.border,
                borderWidth: 1,
                borderRadius: t.radius.lg,
                paddingHorizontal: t.spacing.lg,
                paddingVertical: t.spacing.lg,
                fontSize: t.fontSize.md,
                color: t.colors.foreground,
              }}
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
            <Button title="Submit" onPress={handleSubmit} loading={submitting} fullWidth />
          </>
        ) : (
          <Card>
            <Text variant="body" color="mutedForeground">
              This assignment is no longer pending.
            </Text>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
