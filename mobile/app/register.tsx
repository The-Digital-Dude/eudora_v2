import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRegisterMutation } from '@/features/auth/authApi';
import { passwordError, passwordRuleChecks } from '@/features/auth/passwordRules';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * Native signup — `role` is never sent. `resolveSelfSignupRole` on the server
 * defaults an absent hint to GUARDIAN, and this app has exactly one signup
 * audience: a guardian setting up the family. A freshly created account
 * already has its `GuardianProfile` (server-side, same write as the role
 * grant), so `router.replace('/')` lands straight on `GuardianHomeScreen`'s
 * empty state — "Add your first child" — with no separate onboarding step to
 * chain through first.
 */
export default function RegisterScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.');
      return;
    }
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    const pwError = passwordError(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setError('');
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      }).unwrap();
      router.replace('/');
    } catch (err: any) {
      if (err?.status === 409) {
        setError('That email is already registered — sign in instead.');
        return;
      }
      setError(err?.data?.message || 'Could not create your account. Please try again.');
    }
  };

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
          paddingBottom: insets.bottom + t.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="display" style={{ marginBottom: t.spacing.xs }}>
          Create your account
        </Text>
        <Text variant="body" color="mutedForeground">
          Set up your family&apos;s account — you&apos;ll add your children next.
        </Text>

        <View style={{ height: t.spacing.xxl }} />

        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="label" color="mutedForeground">
              First name
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jamie"
              placeholderTextColor={t.colors.mutedForeground}
              autoCapitalize="words"
              textContentType="givenName"
              style={[inputStyle, { marginTop: t.spacing.sm }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" color="mutedForeground">
              Last name
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Rivera"
              placeholderTextColor={t.colors.mutedForeground}
              autoCapitalize="words"
              textContentType="familyName"
              style={[inputStyle, { marginTop: t.spacing.sm }]}
            />
          </View>
        </View>

        <View style={{ height: t.spacing.lg }} />

        <Text variant="label" color="mutedForeground">
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={t.colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          style={[inputStyle, { marginTop: t.spacing.sm }]}
        />

        <View style={{ height: t.spacing.lg }} />

        <Text variant="label" color="mutedForeground">
          Password
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          onFocus={() => setPasswordFocused(true)}
          placeholder="••••••••"
          placeholderTextColor={t.colors.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          style={[inputStyle, { marginTop: t.spacing.sm }]}
        />

        {/* Shown once the field has been touched, not from the first render —
            a wall of unmet requirements before anyone has typed a character
            reads as an accusation, not help. */}
        {passwordFocused ? (
          <View style={{ marginTop: t.spacing.sm, gap: t.spacing.xs }}>
            {passwordRuleChecks(password).map((rule) => (
              <View
                key={rule.label}
                style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs }}
              >
                {rule.met ? (
                  <Check size={14} color={t.colors.success} />
                ) : (
                  <X size={14} color={t.colors.mutedForeground} />
                )}
                <Text variant="caption" color={rule.met ? 'success' : 'mutedForeground'}>
                  {rule.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

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
          title="Create account"
          onPress={handleSubmit}
          loading={isLoading}
          fullWidth
        />

        <View style={{ height: t.spacing.lg }} />

        <Pressable
          onPress={() => router.replace('/login')}
          accessibilityRole="button"
          style={{ alignSelf: 'center' }}
        >
          <Text variant="label" color="mutedForeground">
            Already have an account? <Text variant="label" color="primary">Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
