import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetOrderQuery } from '@/features/billing/checkoutApi';
import { formatCents } from '@/features/billing/format';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * Where the unlock screen sends the guardian after opening Stripe Checkout in
 * the system browser. Stripe's own post-payment redirect lands the *browser*
 * on the web app's success page — mobile is never told about that directly —
 * so this screen's only source of truth is polling the order it already has
 * the id for.
 *
 * `pollingInterval` (not manual `AppState` listening) is what drives the
 * re-fetch: React Native suspends JS timers while the app is backgrounded, so
 * polling stops the moment the guardian leaves for the browser and picks back
 * up the moment they return — for free, with no lifecycle wiring.
 */
export default function CheckoutPendingScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const { data: order } = useGetOrderQuery(orderId!, {
    skip: !orderId,
    pollingInterval: 2000,
  });

  const status = order?.status ?? 'PENDING';
  const item = order?.items[0];
  const title = item?.course?.title ?? item?.program?.name ?? 'your purchase';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.background,
        justifyContent: 'center',
        padding: t.spacing.xl,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Card style={{ alignItems: 'center', paddingVertical: t.spacing.xxl }}>
        {status === 'PENDING' ? (
          <>
            <ActivityIndicator color={t.colors.primary} size="large" />
            <View style={{ height: t.spacing.lg }} />
            <Text variant="heading" style={{ textAlign: 'center' }}>
              Waiting to hear back from Stripe
            </Text>
            <View style={{ height: t.spacing.sm }} />
            <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
              Finish paying in the browser tab that just opened. This updates on its own —
              you don&apos;t need to keep checking.
            </Text>
          </>
        ) : status === 'PAID' ? (
          <>
            <CheckCircle2 size={48} color={t.colors.success} />
            <View style={{ height: t.spacing.lg }} />
            <Text variant="heading" style={{ textAlign: 'center' }}>
              You&apos;re all set!
            </Text>
            <View style={{ height: t.spacing.sm }} />
            <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
              {title} is unlocked
              {order ? ` · ${formatCents(order.totalCents, order.currency)}` : ''}.
            </Text>
            <View style={{ height: t.spacing.xl }} />
            <Button title="Done" onPress={() => router.replace('/')} fullWidth />
          </>
        ) : (
          <>
            <XCircle size={48} color={t.colors.destructive} />
            <View style={{ height: t.spacing.lg }} />
            <Text variant="heading" style={{ textAlign: 'center' }}>
              {status === 'CANCELLED' ? 'Checkout cancelled' : 'Payment didn’t go through'}
            </Text>
            <View style={{ height: t.spacing.sm }} />
            <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
              {status === 'REFUNDED'
                ? `${title} was refunded.`
                : "Nothing was charged. You can try again whenever you're ready."}
            </Text>
            <View style={{ height: t.spacing.xl }} />
            <Button title="Done" onPress={() => router.replace('/')} fullWidth />
          </>
        )}
      </Card>

      {status === 'PENDING' ? (
        <>
          <View style={{ height: t.spacing.lg }} />
          <Text variant="caption" color="mutedForeground" style={{ textAlign: 'center' }}>
            Closing this is safe — the course unlocks automatically once payment clears.
          </Text>
        </>
      ) : null}
    </View>
  );
}
