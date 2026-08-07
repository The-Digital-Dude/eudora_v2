import { useRouter } from 'expo-router';
import { ChevronLeft, Tv } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApproveDevicePairingMutation } from '@/features/tv-pairing/tvPairingApi';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

const CODE_LENGTH = 6;

export default function TvPairingScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [approved, setApproved] = useState(false);
  const [approveDevicePairing, { isLoading }] = useApproveDevicePairingMutation();

  const handleSubmit = async () => {
    if (code.trim().length < CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-character code shown on your TV.`);
      return;
    }
    setError('');
    try {
      await approveDevicePairing(code.trim().toUpperCase()).unwrap();
      setApproved(true);
    } catch (err: any) {
      setError(err?.data?.message || 'That code is wrong or has expired. Check the TV and try again.');
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Tv size={22} color={t.colors.foreground} />
          <Text variant="title">Link a TV</Text>
        </View>
        <View style={{ height: t.spacing.sm }} />
        <Text variant="body" color="mutedForeground">
          Open Eudora on your TV. It will show a short code — enter it below to sign that TV in as you.
        </Text>
        <View style={{ height: t.spacing.xl }} />

        {approved ? (
          <Card>
            <Text variant="label" color="success">
              TV linked. It should sign in automatically within a few seconds.
            </Text>
          </Card>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase().slice(0, CODE_LENGTH))}
              placeholder="ABCDEF"
              placeholderTextColor={t.colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={CODE_LENGTH}
              style={{
                backgroundColor: t.colors.card,
                borderColor: t.colors.border,
                borderWidth: 1,
                borderRadius: t.radius.lg,
                paddingHorizontal: t.spacing.lg,
                paddingVertical: t.spacing.lg,
                fontSize: t.fontSize.xl,
                letterSpacing: 6,
                textAlign: 'center',
                color: t.colors.foreground,
                minHeight: 52,
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
            <Button title="Link TV" onPress={handleSubmit} loading={isLoading} fullWidth />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
