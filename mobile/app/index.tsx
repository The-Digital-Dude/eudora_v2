import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useGetMeQuery } from '@/features/auth/authApi';
import { GuardianHomeScreen } from '@/features/guardian/GuardianHomeScreen';
import { GuardianOnboardingScreen } from '@/features/guardian/GuardianOnboardingScreen';
import { useActingChild } from '@/features/guardian/useActingChild';
import { StudentHomeScreen } from '@/features/home/StudentHomeScreen';
import { useRegisterPushToken } from '@/features/notifications/pushRegistration';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * Guardian-first. The guardian is the account; a child is a context inside it.
 *
 * This used to treat guardian and student as two coequal *view modes* on one
 * account, persisted through `core/viewPreference.ts`, defaulting to guardian
 * and toggled by a switcher on each home screen. That shape came from a
 * product where a learner signed in for themselves. It no longer matches one
 * where a guardian buys, a child created through the family portal has no
 * password at all, and the API decides which learner a request is about from
 * an `x-acting-student-id` header the guardian's client sends.
 *
 * So the branch is now on *who the account is*, not on a stored preference:
 *
 * - guardian → the family portal, from which they open one child's learning
 *   surface. `useActingChild` owns which child that is, and the same value
 *   feeds the request header, so the screen and the API cannot disagree.
 * - student  → their own learning surface, unchanged. They send no header and
 *   the server resolves them to themselves regardless.
 *
 * An account holding both a student and a guardian profile is rare but legal
 * in the schema; it is treated as a guardian, since the family portal is the
 * superset — their own learning surface is still one tap away.
 */
export default function HomeScreen() {
  const t = useTheme();
  const { data: me, isLoading } = useGetMeQuery();
  const { isGuardian } = useActingChild();
  useRegisterPushToken();

  // Which child's learning surface is open, if any. Deliberately local and
  // unpersisted: *which* child is persisted (that decides the header), but
  // whether the guardian is currently inside a child's surface is navigation
  // state, and reopening the app should land on the portal.
  const [viewingChild, setViewingChild] = useState(false);

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

  if (isGuardian) {
    return viewingChild ? (
      <StudentHomeScreen onExitChildView={() => setViewingChild(false)} />
    ) : (
      <GuardianHomeScreen onOpenChildView={() => setViewingChild(true)} />
    );
  }

  // A GUARDIAN-role account whose profile creation did not complete. Rare now
  // that registration seeds the profile in the same write, but accounts that
  // predate that still exist and would otherwise land on a portal that 404s.
  if (me.roles.includes('GUARDIAN')) return <GuardianOnboardingScreen />;

  return <StudentHomeScreen />;
}
