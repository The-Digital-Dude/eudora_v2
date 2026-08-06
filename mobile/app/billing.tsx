import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/** Read-only — no payment collection here, per the Phase 3 plan's scope. */
export default function BillingScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
