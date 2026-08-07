import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Tv } from 'lucide-react-native';
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

import { useGetMeQuery, useUpdateMyStudentProfileMutation } from '@/features/auth/authApi';
import { useUpdateGuardianProfileMutation } from '@/features/guardian/guardianApi';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * Per-role completion checklist, computed client-side from fields already
 * present on `AuthUser` (plan §"Profile completion", Phase 3) — no stored
 * completion column. Avatar is deliberately excluded from both checklists:
 * `CurrentUserDto` doesn't expose `avatarUrl` yet and mobile has no upload
 * flow (`expo-image-picker` isn't installed) — text fields only, for now.
 */
export function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: me, isLoading } = useGetMeQuery();

  if (isLoading || !me) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.background,
        }}
      >
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

        <Text variant="title">Settings</Text>
        <View style={{ height: t.spacing.xl }} />

        <Pressable onPress={() => router.push('/tv-pairing')} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <Tv size={18} color={t.colors.primary} />
            <Text variant="label" style={{ flex: 1 }}>
              Link a TV
            </Text>
            <ChevronRight size={18} color={t.colors.mutedForeground} />
          </Card>
        </Pressable>
        <View style={{ height: t.spacing.xl }} />

        {me.studentProfile ? (
          <StudentSettings phone={me.studentProfile.phone} address={me.studentProfile.address}
            emergencyContactName={me.studentProfile.emergencyContactName}
            emergencyContactPhone={me.studentProfile.emergencyContactPhone} />
        ) : me.guardianProfile ? (
          <GuardianSettings
            guardianProfileId={me.guardianProfile.id}
            email={me.guardianProfile.email}
            phone={me.guardianProfile.phone}
          />
        ) : (
          <Card>
            <Text variant="body" color="mutedForeground">
              No profile to complete yet.
            </Text>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ChecklistCard({
  items,
}: {
  items: { label: string; done: boolean }[];
}) {
  const t = useTheme();
  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length > 0 ? doneCount / items.length : 0;

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: t.spacing.sm }}>
        <Text variant="label">Profile completion</Text>
        <Text variant="caption" color="mutedForeground">
          {doneCount} / {items.length}
        </Text>
      </View>
      <ProgressBar value={pct} />
      <View style={{ height: t.spacing.lg }} />
      <View style={{ gap: t.spacing.sm }}>
        {items.map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            {item.done ? (
              <CheckCircle2 size={18} color={t.colors.success} />
            ) : (
              <Circle size={18} color={t.colors.mutedForeground} />
            )}
            <Text variant="body" color={item.done ? 'foreground' : 'mutedForeground'}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function useInputStyle() {
  const t = useTheme();
  return {
    backgroundColor: t.colors.card,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
    fontSize: t.fontSize.md,
    color: t.colors.foreground,
    minHeight: 52,
  } as const;
}

function StudentSettings({
  phone,
  address,
  emergencyContactName,
  emergencyContactPhone,
}: {
  phone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}) {
  const t = useTheme();
  const inputStyle = useInputStyle();
  const [updateProfile, { isLoading: saving }] = useUpdateMyStudentProfileMutation();

  const [form, setForm] = useState({
    phone: phone ?? '',
    address: address ?? '',
    emergencyContactName: emergencyContactName ?? '',
    emergencyContactPhone: emergencyContactPhone ?? '',
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      phone: phone ?? '',
      address: address ?? '',
      emergencyContactName: emergencyContactName ?? '',
      emergencyContactPhone: emergencyContactPhone ?? '',
    });
  }, [phone, address, emergencyContactName, emergencyContactPhone]);

  const handleSave = async () => {
    setError('');
    setSaved(false);
    try {
      await updateProfile({
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      }).unwrap();
      setSaved(true);
    } catch (err: any) {
      setError(err?.data?.message || 'Could not save your details.');
    }
  };

  return (
    <>
      <ChecklistCard
        items={[
          { label: 'Phone number', done: !!phone },
          { label: 'Address', done: !!address },
          { label: 'Emergency contact name', done: !!emergencyContactName },
          { label: 'Emergency contact phone', done: !!emergencyContactPhone },
        ]}
      />

      <View style={{ height: t.spacing.xl }} />

      <Text variant="label" color="mutedForeground">
        Phone
      </Text>
      <TextInput
        value={form.phone}
        onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
        placeholder="(555) 000-0000"
        placeholderTextColor={t.colors.mutedForeground}
        keyboardType="phone-pad"
        style={[inputStyle, { marginTop: t.spacing.sm }]}
      />

      <View style={{ height: t.spacing.lg }} />

      <Text variant="label" color="mutedForeground">
        Address
      </Text>
      <TextInput
        value={form.address}
        onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
        placeholder="Street, city, state"
        placeholderTextColor={t.colors.mutedForeground}
        style={[inputStyle, { marginTop: t.spacing.sm }]}
      />

      <View style={{ height: t.spacing.lg }} />

      <Text variant="label" color="mutedForeground">
        Emergency contact name
      </Text>
      <TextInput
        value={form.emergencyContactName}
        onChangeText={(v) => setForm((f) => ({ ...f, emergencyContactName: v }))}
        placeholder="Full name"
        placeholderTextColor={t.colors.mutedForeground}
        style={[inputStyle, { marginTop: t.spacing.sm }]}
      />

      <View style={{ height: t.spacing.lg }} />

      <Text variant="label" color="mutedForeground">
        Emergency contact phone
      </Text>
      <TextInput
        value={form.emergencyContactPhone}
        onChangeText={(v) => setForm((f) => ({ ...f, emergencyContactPhone: v }))}
        placeholder="(555) 000-0000"
        placeholderTextColor={t.colors.mutedForeground}
        keyboardType="phone-pad"
        style={[inputStyle, { marginTop: t.spacing.sm }]}
      />

      <StatusRow error={error} saved={saved} />

      <View style={{ height: t.spacing.xl }} />
      <Button title="Save" onPress={handleSave} loading={saving} fullWidth />
    </>
  );
}

function GuardianSettings({
  guardianProfileId,
  email,
  phone,
}: {
  guardianProfileId: string;
  email: string | null;
  phone: string | null;
}) {
  const t = useTheme();
  const inputStyle = useInputStyle();
  const [updateProfile, { isLoading: saving }] = useUpdateGuardianProfileMutation();

  const [form, setForm] = useState({ email: email ?? '', phone: phone ?? '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ email: email ?? '', phone: phone ?? '' });
  }, [email, phone]);

  const handleSave = async () => {
    setError('');
    setSaved(false);
    try {
      await updateProfile({
        id: guardianProfileId,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      }).unwrap();
      setSaved(true);
    } catch (err: any) {
      setError(err?.data?.message || 'Could not save your details.');
    }
  };

  return (
    <>
      <ChecklistCard
        items={[
          { label: 'Email', done: !!email },
          { label: 'Phone number', done: !!phone },
        ]}
      />

      <View style={{ height: t.spacing.xl }} />

      <Text variant="label" color="mutedForeground">
        Email
      </Text>
      <TextInput
        value={form.email}
        onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
        placeholder="you@example.com"
        placeholderTextColor={t.colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={[inputStyle, { marginTop: t.spacing.sm }]}
      />

      <View style={{ height: t.spacing.lg }} />

      <Text variant="label" color="mutedForeground">
        Phone
      </Text>
      <TextInput
        value={form.phone}
        onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
        placeholder="(555) 000-0000"
        placeholderTextColor={t.colors.mutedForeground}
        keyboardType="phone-pad"
        style={[inputStyle, { marginTop: t.spacing.sm }]}
      />

      <StatusRow error={error} saved={saved} />

      <View style={{ height: t.spacing.xl }} />
      <Button title="Save" onPress={handleSave} loading={saving} fullWidth />
    </>
  );
}

function StatusRow({ error, saved }: { error: string; saved: boolean }) {
  const t = useTheme();
  if (!error && !saved) return null;

  return (
    <View
      style={{
        marginTop: t.spacing.lg,
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: error
          ? t.colors.destructive + '1a'
          : t.colors.success + '1a',
      }}
    >
      <Text variant="label" color={error ? 'destructive' : 'success'}>
        {error || 'Saved.'}
      </Text>
    </View>
  );
}
