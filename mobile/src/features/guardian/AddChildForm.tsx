import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

import { useCreateChildMutation } from './guardianApi';

interface AddChildFormProps {
  onCreated: () => void;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Creates a brand-new child under the calling guardian — the primary path for
 * a guardian-first signup, where the child has never had an account of their
 * own. Shared between `app/guardian/add-child.tsx` (reachable any time a
 * guardian is signed in) and nothing else yet; `GuardianOnboardingScreen`'s
 * step 2 keeps its existing link-by-email flow for the legacy accounts that
 * still reach it, rather than being folded into this component.
 *
 * `birthDate` is a plain `YYYY-MM-DD` text field rather than a native date
 * picker: the project has no date-picker dependency, and adding a second new
 * native module in the same pass as `expo-document-picker` (W4) was more than
 * this form needs to justify. Worth revisiting once there's a second consumer
 * for one.
 */
export function AddChildForm({ onCreated }: AddChildFormProps) {
  const t = useTheme();
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [createChild, { isLoading }] = useCreateChildMutation();

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
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Enter your child's name.");
      return;
    }
    if (!DATE_PATTERN.test(birthDate)) {
      setError('Enter their birth date as YYYY-MM-DD.');
      return;
    }
    const parsed = new Date(birthDate);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      setError("That birth date doesn't look right.");
      return;
    }
    setError('');
    try {
      await createChild({ fullName: trimmedName, birthDate }).unwrap();
      onCreated();
    } catch (err: any) {
      setError(err?.data?.message || 'Could not add your child. Please try again.');
    }
  };

  return (
    <View>
      <Text variant="label" color="mutedForeground">
        Child&apos;s full name
      </Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Their full name"
        placeholderTextColor={t.colors.mutedForeground}
        autoCapitalize="words"
        style={[inputStyle, { marginTop: t.spacing.sm }]}
      />

      <View style={{ height: t.spacing.lg }} />

      <Text variant="label" color="mutedForeground">
        Birth date
      </Text>
      <TextInput
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={t.colors.mutedForeground}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        style={[inputStyle, { marginTop: t.spacing.sm }]}
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
      <Button title="Add child" onPress={handleSubmit} loading={isLoading} fullWidth />
    </View>
  );
}
