import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getStoredView, setStoredView, type ProfileView } from '@/core/viewPreference';
import { useGetMeQuery } from '@/features/auth/authApi';
import { GuardianHomeScreen } from '@/features/guardian/GuardianHomeScreen';
import { GuardianOnboardingScreen } from '@/features/guardian/GuardianOnboardingScreen';
import { StudentHomeScreen } from '@/features/home/StudentHomeScreen';
import { useRegisterPushToken } from '@/features/notifications/pushRegistration';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * Branches on `guardianProfile` presence, not role membership alone — a user
 * can hold both the GUARDIAN role and a student profile (the schema allows
 * it). When both `studentProfile` and `guardianProfile` are present, a small
 * switcher on each home screen (see `onSwitchView` below) picks which one
 * renders, persisted locally via `core/viewPreference.ts`; every other
 * account never touches `view` at all, so this is a no-op for the common
 * single-role case. Default is guardian, matching the pre-switcher behavior.
 *
 * A GUARDIAN-role user with no `guardianProfile` yet (freshly registered,
 * profile creation still pending) gets the onboarding wizard instead of
 * either home screen.
 */
export default function HomeScreen() {
  const t = useTheme();
  const { data: me, isLoading } = useGetMeQuery();
  useRegisterPushToken();
  const [view, setView] = useState<ProfileView>(() => getStoredView() ?? 'guardian');

  const handleSwitchView = (next: ProfileView) => {
    setStoredView(next);
    setView(next);
  };

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

  if (me.studentProfile && me.guardianProfile) {
    return view === 'student' ? (
      <StudentHomeScreen onSwitchToGuardian={() => handleSwitchView('guardian')} />
    ) : (
      <GuardianHomeScreen onSwitchToStudent={() => handleSwitchView('student')} />
    );
  }

  if (me.guardianProfile) return <GuardianHomeScreen />;
  if (me.roles.includes('GUARDIAN')) return <GuardianOnboardingScreen />;
  return <StudentHomeScreen />;
}
