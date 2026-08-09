import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

import { useGetMeQuery } from '@/features/auth/authApi';
import {
  useGetThreadQuery,
  useMarkThreadReadMutation,
  usePostMessageMutation,
} from '@/features/messaging/messagingApi';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function ThreadDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  const { data: me } = useGetMeQuery();
  const { data: thread, isLoading } = useGetThreadQuery(threadId!, { skip: !threadId });
  const [markRead] = useMarkThreadReadMutation();
  const [postMessage, { isLoading: sending }] = usePostMessageMutation();

  const [body, setBody] = useState('');

  useEffect(() => {
    if (threadId) void markRead(threadId);
    // Only needs to fire once per thread visit — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const handleSend = async () => {
    if (!body.trim() || !threadId) return;
    const text = body.trim();
    setBody('');
    try {
      await postMessage({ threadId, body: text }).unwrap();
    } catch {
      setBody(text);
    }
  };

  if (isLoading || !thread) {
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.xl,
          paddingTop: insets.top + t.spacing.sm,
          paddingBottom: t.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: t.colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ChevronLeft size={22} color={t.colors.mutedForeground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: t.spacing.sm }}>
          <Text variant="label" numberOfLines={1}>
            {thread.subject}
          </Text>
          <Text variant="caption" color="mutedForeground">
            {thread.teacher.firstName} {thread.teacher.lastName}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.sm }}
      >
        {thread.messages.map((msg) => {
          const isOwn = msg.senderUserId === me?.id;
          return (
            <View
              key={msg.id}
              style={{
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: isOwn ? t.colors.primary : t.colors.card,
                borderRadius: t.radius.lg,
                borderWidth: isOwn ? 0 : 1,
                borderColor: t.colors.border,
                paddingVertical: t.spacing.sm,
                paddingHorizontal: t.spacing.md,
              }}
            >
              <Text variant="body" style={{ color: isOwn ? t.colors.primaryForeground : t.colors.foreground }}>
                {msg.body}
              </Text>
              <Text
                variant="caption"
                style={{
                  marginTop: t.spacing.xs,
                  color: isOwn ? t.colors.primaryForeground : t.colors.mutedForeground,
                  opacity: 0.8,
                }}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          padding: t.spacing.md,
          paddingBottom: insets.bottom + t.spacing.md,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          backgroundColor: t.colors.card,
        }}
      >
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write a message…"
          placeholderTextColor={t.colors.mutedForeground}
          multiline
          style={{
            flex: 1,
            maxHeight: 100,
            backgroundColor: t.colors.background,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.colors.border,
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.sm,
            color: t.colors.foreground,
            fontSize: t.fontSize.md,
          }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!body.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={{
            width: 44,
            height: 44,
            borderRadius: t.radius.pill,
            backgroundColor: t.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !body.trim() || sending ? 0.5 : 1,
          }}
        >
          <Send size={18} color={t.colors.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
