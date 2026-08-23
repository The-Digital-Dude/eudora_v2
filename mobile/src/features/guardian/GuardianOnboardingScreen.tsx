import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import {
  useCreateGuardianProfileMutation,
  useSelfLinkStudentMutation,
} from './guardianApi';

/**
 * Repairs a legacy state, not the primary signup path. A fresh registration
 * (`app/register.tsx` → `POST /auth/token/register`) writes the
 * `GuardianProfile` in the same transaction as the role grant, so a new
 * account never reaches this screen at all — `app/index.tsx` only renders it
 * when `me.roles` includes GUARDIAN but `guardianProfile` is still absent,
 * which by now means an account created before that seed existed.
 *
 * Step 1 creates the profile (fullName/phone) via the same `/me` upsert the
 * web onboarding wizard uses. Step 2 links an *existing* student account by
 * email — kept as-is here rather than folded into `AddChildForm`, since a
 * guardian who reaches this screen already has a student account to link,
 * where a fresh signup's guardian does not. Finishing (or skipping step 2)
 * navigates to `/`, which re-fetches `getMe` on mount
 * (`refetchOnMountOrArgChange` is on globally) and now finds `guardianProfile`
 * set, routing to `GuardianHomeScreen` — whose own empty state is where
 * `AddChildForm` lives for anyone who wants to add a new child instead.
 */
export function GuardianOnboardingScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [error, setError] = useState('');

  const [createProfile, { isLoading: creatingProfile }] =
    useCreateGuardianProfileMutation();
  const [selfLink, { isLoading: linking }] = useSelfLinkStudentMutation();

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

  const handleCreateProfile = async () => {
    if (!fullName.trim()) {
      setError('Enter your full name.');
      return;
    }
    setError('');
    try {
      await createProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      }).unwrap();
      setStep(2);
    } catch (err: any) {
      setError(err?.data?.message || 'Could not save your details.');
    }
  };

  const handleSelfLink = async () => {
    if (!studentEmail.trim()) {
      setError("Enter the student's email.");
      return;
    }
    setError('');
    try {
      await selfLink({ studentEmail: studentEmail.trim() }).unwrap();
      router.replace('/');
    } catch (err: any) {
      setError(err?.data?.message || 'No student account matches that email.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: t.spacing.xl,
          paddingTop: insets.top + t.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" color="mutedForeground">
          Step {step} of 2
        </Text>
        <Text variant="display" style={{ marginBottom: t.spacing.xs }}>
          {step === 1 ? "Let's set up your account" : 'Link a student'}
        </Text>
        <Text variant="body" color="mutedForeground">
          {step === 1
            ? 'A few details so we know who to notify.'
            : "Enter your child's account email to see their progress."}
        </Text>

        <View style={{ height: t.spacing.xxl }} />

        {step === 1 ? (
          <>
            <Text variant="label" color="mutedForeground">
              Full name
            </Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={t.colors.mutedForeground}
              style={[inputStyle, { marginTop: t.spacing.sm }]}
            />

            <View style={{ height: t.spacing.lg }} />

            <Text variant="label" color="mutedForeground">
              Phone (optional)
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor={t.colors.mutedForeground}
              keyboardType="phone-pad"
              style={[inputStyle, { marginTop: t.spacing.sm }]}
            />
          </>
        ) : (
          <>
            <Text variant="label" color="mutedForeground">
              Student's email
            </Text>
            <TextInput
              value={studentEmail}
              onChangeText={setStudentEmail}
              placeholder="student@example.com"
              placeholderTextColor={t.colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[inputStyle, { marginTop: t.spacing.sm }]}
            />
          </>
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

        {step === 1 ? (
          <Button
            title="Continue"
            onPress={handleCreateProfile}
            loading={creatingProfile}
            fullWidth
          />
        ) : (
          <>
            <Button title="Link student" onPress={handleSelfLink} loading={linking} fullWidth />
            <View style={{ height: t.spacing.md }} />
            <Button
              title="Skip for now"
              variant="ghost"
              onPress={() => router.replace('/')}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
