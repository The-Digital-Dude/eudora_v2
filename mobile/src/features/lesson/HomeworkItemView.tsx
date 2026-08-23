import * as DocumentPicker from 'expo-document-picker';
import { Paperclip, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import type { HomeworkAttachmentUpload, ModuleItem } from '@/core/contracts';
import { useGetMyHomeworkForItemQuery } from '@/features/catalog/catalogApi';
import { useActingChild } from '@/features/guardian/useActingChild';
import { dueLabel, fileSizeLabel } from '@/features/homework/format';
import {
  useSubmitHomeworkMutation,
  useUploadHomeworkAttachmentMutation,
} from '@/features/homework/homeworkApi';
import { LockedItemNotice } from '@/features/lesson/LockedItemNotice';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface HomeworkItemViewProps {
  item: ModuleItem;
  courseId: string;
}

/** What the server's `student-work.validator.ts` will accept. Kept in sync by
 * hand — a mismatch here costs an extra round trip to a 400, not a security
 * gap, since the server re-checks the actual bytes regardless. */
const ACCEPTED_MIMETYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
const MAX_ATTACHMENTS = 5;

/**
 * The HOMEWORK module-item kind — a course checkpoint, distinct from the
 * standalone cohort homework reached through the Homework tab
 * (`app/homework/*`). Brief and submission both come from
 * `GET .../my-homework`; submitting reuses the same `/homework/submit` mutation
 * the standalone screen uses, since both ultimately create the same
 * `HomeworkSubmission` row.
 *
 * Resubmission *replaces* the attachment set server-side, so local state seeds
 * from any existing submission's files and every id present at submit time —
 * carried over or newly added — is what survives. Dropping a file from the
 * list before resubmitting is how a learner removes it.
 */
export function HomeworkItemView({ item, courseId }: HomeworkItemViewProps) {
  const t = useTheme();
  const { actingChildId } = useActingChild();

  const { data, isLoading, isError } = useGetMyHomeworkForItemQuery(
    { moduleItemId: item.id, actingChildId },
    // Locked items 403 on this route (`assertItemAccess`) rather than
    // returning an empty body, so this must not even ask — same reasoning
    // VideoItemView/ReadingItemView apply by reading a nulled field instead.
    { skip: item.isContentLocked },
  );

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<HomeworkAttachmentUpload[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [submitHomework, { isLoading: submitting }] = useSubmitHomeworkMutation();
  const [uploadAttachment] = useUploadHomeworkAttachmentMutation();

  // Seeds once from the first submission the query returns, then leaves local
  // state alone — a refetch after submitting must not stomp what the learner
  // is mid-edit on, and a refetch after grading must not wipe an unsent draft.
  useEffect(() => {
    if (seeded || !data?.submission) return;
    setContent(data.submission.content ?? '');
    setAttachments(
      data.submission.attachments.map((a) => ({
        id: a.fileUploadId,
        originalName: a.file.originalName,
        size: a.file.size,
        mimetype: a.file.mimetype,
      })),
    );
    setSeeded(true);
  }, [data, seeded]);

  if (item.isContentLocked) {
    return <LockedItemNotice courseId={courseId} what="checkpoint brief" />;
  }

  if (isLoading) {
    return <ActivityIndicator color={t.colors.primary} />;
  }

  if (isError || !data) {
    return (
      <Card>
        <Text variant="body" color="mutedForeground">
          Couldn&apos;t load this checkpoint. Pull to refresh and try again.
        </Text>
      </Card>
    );
  }

  const { homework, submission } = data;
  const graded = submission?.status === 'GRADED';
  const remainingSlots = MAX_ATTACHMENTS - attachments.length;

  const handlePickFiles = async () => {
    if (remainingSlots <= 0) return;
    setError('');
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_MIMETYPES,
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const picked = result.assets.slice(0, remainingSlots);
    setUploading(true);
    try {
      for (const asset of picked) {
        const uploaded = await uploadAttachment({
          uri: asset.uri,
          name: asset.name,
          mimetype: asset.mimeType ?? 'application/octet-stream',
        }).unwrap();
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err: any) {
      setError(err?.data?.message || 'Could not upload that file.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    if (!content.trim() && attachments.length === 0) {
      setError('Add a submission or attach a file before sending.');
      return;
    }
    setError('');
    try {
      await submitHomework({
        homeworkId: homework.id,
        content: content.trim() || undefined,
        attachmentFileIds: attachments.map((a) => a.id),
      }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || 'Could not submit this checkpoint.');
    }
  };

  return (
    <View>
      <Text variant="caption" color="mutedForeground">
        {homework.maxPoints} pts · {dueLabel(homework.dueDate)}
      </Text>

      {homework.description ? (
        <>
          <View style={{ height: t.spacing.md }} />
          <Card>
            <Text variant="body">{homework.description}</Text>
          </Card>
        </>
      ) : null}

      {submission ? (
        <>
          <View style={{ height: t.spacing.lg }} />
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" color={graded ? 'success' : 'primary'}>
                {graded ? 'Graded' : 'Submitted'}
              </Text>
              <Text variant="caption" color="mutedForeground">
                {new Date(submission.submissionDate).toLocaleDateString()}
              </Text>
            </View>
            {graded ? (
              <>
                <View style={{ height: t.spacing.sm }} />
                <Text variant="heading">
                  {submission.pointsEarned} / {homework.maxPoints} pts
                </Text>
                {submission.feedback ? (
                  <>
                    <View style={{ height: t.spacing.xs }} />
                    <Text variant="body" color="mutedForeground">
                      {submission.feedback}
                    </Text>
                  </>
                ) : null}
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      <View style={{ height: t.spacing.xl }} />
      <Text variant="label" color="mutedForeground">
        {submission ? 'Update your submission' : 'Your submission'}
      </Text>
      {graded ? (
        <>
          <View style={{ height: t.spacing.xs }} />
          <Text variant="caption" color="warning">
            Submitting again clears the grade above until it's re-marked.
          </Text>
        </>
      ) : null}
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Type your answer or paste a link to your work…"
        placeholderTextColor={t.colors.mutedForeground}
        multiline
        style={{
          marginTop: t.spacing.sm,
          minHeight: 140,
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

      <View style={{ height: t.spacing.md }} />
      {attachments.map((a) => (
        <View
          key={a.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.sm,
            paddingVertical: t.spacing.xs,
          }}
        >
          <Paperclip size={14} color={t.colors.mutedForeground} />
          <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            {a.originalName}
          </Text>
          <Text variant="caption" color="mutedForeground">
            {fileSizeLabel(a.size)}
          </Text>
          <Pressable
            onPress={() => handleRemoveAttachment(a.id)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${a.originalName}`}
            hitSlop={8}
          >
            <X size={14} color={t.colors.destructive} />
          </Pressable>
        </View>
      ))}

      {remainingSlots > 0 ? (
        <Button
          title={uploading ? 'Uploading…' : 'Attach a file'}
          variant="ghost"
          onPress={handlePickFiles}
          loading={uploading}
          disabled={uploading}
          style={{ marginTop: t.spacing.xs }}
        />
      ) : (
        <Text variant="caption" color="mutedForeground" style={{ marginTop: t.spacing.xs }}>
          Maximum {MAX_ATTACHMENTS} files attached.
        </Text>
      )}

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
      <Button
        title={submission ? 'Resubmit' : 'Submit'}
        onPress={handleSubmit}
        loading={submitting}
        disabled={uploading}
        fullWidth
      />
    </View>
  );
}
