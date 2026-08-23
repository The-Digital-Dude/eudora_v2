import React, { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import type { ModuleItem } from '@/core/contracts';
import {
  useAddDiscussionPostMutation,
  useGetDiscussionQuery,
  useUpdateModuleItemProgressMutation,
} from '@/features/catalog/catalogApi';
import { useActingChild } from '@/features/guardian/useActingChild';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface DiscussionItemViewProps {
  item: ModuleItem;
}

/**
 * Matches the web DiscussionView: completion criterion is "posted at least
 * once" — marked complete only on the student's first post, not on merely
 * viewing the thread.
 */
export function DiscussionItemView({ item }: DiscussionItemViewProps) {
  const t = useTheme();
  const { actingChildId } = useActingChild();
  const { data: thread, isLoading } = useGetDiscussionQuery({
    moduleItemId: item.id,
    actingChildId,
  });
  const [addPost, { isLoading: posting }] = useAddDiscussionPostMutation();
  const [updateProgress] = useUpdateModuleItemProgressMutation();
  const [body, setBody] = useState('');

  const handlePost = async () => {
    if (!body.trim()) return;
    try {
      await addPost({
        moduleItemId: item.id,
        body: body.trim(),
        actingChildId,
      }).unwrap();
      setBody('');
      if (!item.isDone) {
        void updateProgress({ id: item.id, completed: true });
      }
    } catch {
      // Errors surface via the disabled/loading state; nothing further to do
      // in Phase 2 for a failed post.
    }
  };

  if (isLoading || !thread) {
    return <ActivityIndicator color={t.colors.primary} />;
  }

  return (
    <View>
      <Card style={{ backgroundColor: t.colors.secondary }}>
        <Text variant="label">{thread.prompt}</Text>
      </Card>

      <View style={{ height: t.spacing.lg }} />

      {thread.posts.length === 0 ? (
        <Text variant="caption" color="mutedForeground">
          No replies yet — be the first to share.
        </Text>
      ) : (
        <View style={{ gap: t.spacing.md }}>
          {thread.posts.map((post) => (
            <View
              key={post.id}
              style={{
                paddingLeft: post.parentPostId ? t.spacing.xl : 0,
              }}
            >
              <Text variant="caption" color="primary">
                {post.studentProfile.fullName}
              </Text>
              <Text variant="body">{post.body}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: t.spacing.xl }} />

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Share your thoughts..."
        placeholderTextColor={t.colors.mutedForeground}
        multiline
        style={{
          minHeight: 80,
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: t.radius.md,
          padding: t.spacing.md,
          color: t.colors.foreground,
          fontSize: t.fontSize.md,
          textAlignVertical: 'top',
        }}
      />
      <View style={{ height: t.spacing.md }} />
      <Button
        title="Post reply"
        onPress={handlePost}
        loading={posting}
        disabled={!body.trim()}
      />
    </View>
  );
}
