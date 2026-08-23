import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddChildForm } from '@/features/guardian/AddChildForm';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * Reachable any time a guardian is signed in — from `GuardianHomeScreen`'s
 * empty state on a fresh account, and from its "+" once children already
 * exist. Not part of `GuardianOnboardingScreen`'s flow; that screen's own
 * step 2 (link an existing student by email) stays as-is for the legacy
 * accounts that still reach it.
 */
export default function AddChildScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

        <Text variant="title">Add a child</Text>
        <View style={{ height: t.spacing.xs }} />
        <Text variant="body" color="mutedForeground">
          Set up their profile so you can see their progress and pick courses for them.
        </Text>

        <View style={{ height: t.spacing.xxl }} />
        <AddChildForm onCreated={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
