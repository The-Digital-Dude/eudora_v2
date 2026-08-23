import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetFamilyEntitlementsQuery } from '@/features/billing/checkoutApi';
import { useGetInvoicesQuery, useGetPaymentsQuery } from '@/features/guardian/guardianApi';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

function formatAmount(amount: string, currency: string) {
  const value = Number(amount);
  return Number.isFinite(value)
    ? `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : `${currency} ${amount}`;
}

/**
 * `formatAmount` above and `formatCents` from `features/billing/format.ts` are
 * deliberately different functions, not a shared one: invoices/payments carry
 * decimal-string amounts from a different part of the schema than the
 * checkout flow's integer-cents fields. Dividing one format as if it were the
 * other would be a real bug, not a style inconsistency.
 */

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
  const { data: invoices, isLoading: loadingInvoices } = useGetInvoicesQuery();
  const { data: payments, isLoading: loadingPayments } = useGetPaymentsQuery();

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

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Invoices</Text>
      <View style={{ height: t.spacing.md }} />
      {loadingInvoices ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : !invoices || invoices.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No invoices yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{inv.description ?? 'Invoice'}</Text>
                <Text variant="label">{formatAmount(inv.amount, inv.currency)}</Text>
              </View>
              <View style={{ height: t.spacing.xs }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" color="mutedForeground">
                  Due {new Date(inv.dueDate).toLocaleDateString()}
                </Text>
                <Text
                  variant="caption"
                  color={
                    inv.status === 'PAID'
                      ? 'success'
                      : inv.status === 'OVERDUE'
                        ? 'destructive'
                        : 'warning'
                  }
                >
                  {inv.status}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={{ height: t.spacing.xxl }} />
      <Text variant="heading">Payments</Text>
      <View style={{ height: t.spacing.md }} />
      {loadingPayments ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : !payments || payments.length === 0 ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            No payments recorded yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: t.spacing.sm }}>
          {payments.map((p) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{p.method.replace(/_/g, ' ')}</Text>
                <Text variant="label" color="success">
                  {formatAmount(p.amount, p.currency)}
                </Text>
              </View>
              <View style={{ height: t.spacing.xs }} />
              <Text variant="caption" color="mutedForeground">
                {new Date(p.paymentDate).toLocaleDateString()}
                {p.reference ? ` · ${p.reference}` : ''}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
