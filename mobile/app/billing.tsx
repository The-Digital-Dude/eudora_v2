import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetFamilyEntitlementsQuery } from '@/features/billing/checkoutApi';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

const ENTITLEMENT_STATUS_COLOR: Record<string, 'success' | 'warning' | 'mutedForeground'> = {
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  EXPIRED: 'mutedForeground',
  REVOKED: 'mutedForeground',
};

/** Read-only — no payment collection here, per the Phase 3 plan's scope. */
export default function BillingScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: entitlementsByChild, isLoading: loadingEntitlements } =
    useGetFamilyEntitlementsQuery();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      contentContainerStyle={{
        padding: t.spacing.xl,
        paddingTop: insets.top + t.spacing.md,
        paddingBottom: insets.bottom + t.spacing.xxl,
      }}
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

      <Text variant="title">Billing</Text>
      <View style={{ height: t.spacing.xl }} />

      <Text variant="heading">What we own</Text>
      <View style={{ height: t.spacing.md }} />
      {loadingEntitlements ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : !entitlementsByChild || entitlementsByChild.every((c) => c.entitlements.length === 0) ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            Nothing unlocked yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.lg }}>
          {entitlementsByChild
            .filter((child) => child.entitlements.length > 0)
            .map((child) => (
              <View key={child.studentProfileId}>
                <Text variant="label" color="mutedForeground">
                  {child.fullName}
                </Text>
                <View style={{ height: t.spacing.sm }} />
                <View style={{ gap: t.spacing.sm }}>
                  {child.entitlements.map((ent) => {
                    const title = ent.course?.title ?? ent.program?.name ?? 'Unknown';
                    const plan = ent.orderItem?.plan;
                    return (
                      <Card key={ent.id}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text variant="body" style={{ flex: 1 }}>
                            {title}
                          </Text>
                          <Text
                            variant="caption"
                            color={ENTITLEMENT_STATUS_COLOR[ent.status] ?? 'mutedForeground'}
                          >
                            {ent.status.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        {plan ? (
                          <>
                            <View style={{ height: t.spacing.xs }} />
                            <Text variant="caption" color="mutedForeground">
                              Instalment {plan.installmentsPaid} of {plan.installmentCount}
                              {plan.paidThroughDate
                                ? ` · paid through ${new Date(plan.paidThroughDate).toLocaleDateString()}`
                                : ''}
                            </Text>
                          </>
                        ) : ent.accessExpiresAt ? (
                          <>
                            <View style={{ height: t.spacing.xs }} />
                            <Text variant="caption" color="mutedForeground">
                              Access until {new Date(ent.accessExpiresAt).toLocaleDateString()}
                            </Text>
                          </>
                        ) : null}
                      </Card>
                    );
                  })}
                </View>
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
}
