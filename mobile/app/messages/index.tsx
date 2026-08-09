import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MessageThread } from '@/core/contracts';
import { useGetThreadsQuery } from '@/features/messaging/messagingApi';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/** Guardian-only — `/messages/*` is @Roles('GUARDIAN', 'TEACHER', ...) server-side, students have no path here. */
export default function MessagesScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: threads, isLoading, isFetching, refetch } = useGetThreadsQuery();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      contentContainerStyle={{
        padding: t.spacing.xl,
        paddingTop: insets.top + t.spacing.md,
        paddingBottom: insets.bottom + t.spacing.xxl,
      }}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={t.colors.primary} />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <ChevronLeft size={20} color={t.colors.mutedForeground} />
          <Text variant="label" color="mutedForeground">
            Back
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/messages/new')}
          accessibilityRole="button"
          accessibilityLabel="New message"
          hitSlop={8}
        >
          <MessageSquarePlus size={22} color={t.colors.primary} />
        </Pressable>
      </View>

      <View style={{ height: t.spacing.lg }} />
      <Text variant="title">Messages</Text>
      <View style={{ height: t.spacing.xl }} />

      {isLoading ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : !threads || threads.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: t.spacing.xxl }}>
          <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
            No conversations yet. Tap the compose icon to message a teacher.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.md }}>
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ThreadRow({ thread }: { thread: MessageThread }) {
  const t = useTheme();
  const router = useRouter();
  const lastMessage = thread.messages[0];
  const unread = (thread.unreadCount ?? 0) > 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/messages/[threadId]', params: { threadId: thread.id } })}
      accessibilityRole="button"
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.md }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
              <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                {thread.subject}
              </Text>
              {unread ? (
                <View
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: t.radius.pill,
                    backgroundColor: t.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                  }}
                >
                  <Text variant="caption" style={{ color: t.colors.primaryForeground }}>
                    {thread.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ height: t.spacing.xs }} />
            <Text variant="caption" color="mutedForeground">
              {thread.teacher.firstName} {thread.teacher.lastName}
              {thread.studentProfile ? ` · ${thread.studentProfile.fullName}` : ''}
            </Text>
            {lastMessage ? (
              <>
                <View style={{ height: t.spacing.xs }} />
                <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                  {lastMessage.body}
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
