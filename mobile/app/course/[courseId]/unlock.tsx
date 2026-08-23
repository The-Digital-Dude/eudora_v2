import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CreateCheckoutSessionPayload } from '@/core/contracts';
import { useGetCourseDetailQuery } from '@/features/catalog/catalogApi';
import { formatCents } from '@/features/billing/format';
import {
  useCreateCheckoutSessionMutation,
  useGetOpenBatchesQuery,
  useResolveSkuMutation,
} from '@/features/billing/checkoutApi';
import { useActingChild } from '@/features/guardian/useActingChild';
import { Button } from '@/ui/primitives/Button';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

/**
 * The purchase screen for one course, for one child. Never reachable for a
 * student browsing their own account — `resolve-sku` and `checkout-session`
 * are `@Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')` server-side, so a student
 * caller would just 403; the "Unlock" entry points upstream already hide
 * behind `isGuardian`, and this screen mirrors that rather than trusting
 * navigation alone.
 *
 * `resolveSku` is a POST (mutation), not a GET, in the API — so the price is
 * fetched once on mount rather than kept live via a query. Re-running it is
 * cheap and safe (it has no side effect), so a retry after an error just
 * calls it again.
 */
export default function UnlockCourseScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const { actingChildId, learnerId, activeChild, isGuardian } = useActingChild();
  const { data: course } = useGetCourseDetailQuery(
    { courseId: courseId!, actingChildId },
    { skip: !courseId },
  );

  const [resolveSku, { data: sku, isLoading: resolving, error: resolveError }] =
    useResolveSkuMutation();
  const [createSession, { isLoading: startingCheckout }] =
    useCreateCheckoutSessionMutation();

  const isLive = course?.deliveryMode === 'LIVE';
  const { data: batches, isLoading: loadingBatches } = useGetOpenBatchesQuery(
    courseId!,
    { skip: !courseId || !isLive },
  );
  const [batchId, setBatchId] = useState<string | null>(null);

  const [billingMode, setBillingMode] = useState<
    CreateCheckoutSessionPayload['billingMode']
  >('ONE_TIME');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!courseId || !learnerId) return;
    void resolveSku({ studentProfileId: learnerId, skuType: 'COURSE', skuId: courseId });
  }, [courseId, learnerId, resolveSku]);

  const handleUnlock = async () => {
    if (!courseId || !learnerId) return;
    if (isLive && !batchId) {
      setError('Choose a class time before continuing.');
      return;
    }
    setError('');
    try {
      const result = await createSession({
        studentProfileId: learnerId,
        skuType: 'COURSE',
        skuId: courseId,
        billingMode,
        ...(isLive && batchId ? { batchId } : {}),
      }).unwrap();

      // Stripe's own hosted page — the system browser, not a WebView, is the
      // point: it carries the guardian's saved cards and is what Stripe
      // itself expects to render checkout inside.
      await Linking.openURL(result.checkoutUrl);
      router.replace({
        pathname: '/checkout/[orderId]',
        params: { orderId: result.orderId },
      });
    } catch (err: any) {
      setError(err?.data?.message || 'Could not start checkout. Please try again.');
    }
  };

  if (!isGuardian) {
    return (
      <View style={centered(t.colors.background)}>
        <Text variant="body" color="mutedForeground" style={{ textAlign: 'center', padding: t.spacing.xl }}>
          Only a guardian can purchase a course. Ask them to unlock it from their account.
        </Text>
      </View>
    );
  }

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

      <Text variant="title">{course?.title ?? 'Unlock course'}</Text>
      {activeChild ? (
        <Text variant="caption" color="mutedForeground" style={{ marginTop: t.spacing.xs }}>
          For {activeChild.fullName}
        </Text>
      ) : null}

      <View style={{ height: t.spacing.xl }} />

      {resolving || !sku ? (
        <ActivityIndicator color={t.colors.primary} />
      ) : resolveError ? (
        <Card>
          <Text variant="body" color="destructive">
            Couldn&apos;t load pricing. Pull down and try again.
          </Text>
        </Card>
      ) : sku.resolution === 'OWNED' ? (
        <Card>
          <Text variant="body" color="success">
            {sku.message ?? 'Already unlocked.'}
          </Text>
          <View style={{ height: t.spacing.lg }} />
          <Button title="Go to course" onPress={() => router.back()} />
        </Card>
      ) : sku.resolution === 'NOT_SELLABLE' || sku.resolution === 'BLOCKED_ACTIVE_PLAN' ? (
        <Card>
          <Text variant="body" color="mutedForeground">
            {sku.message}
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="heading">{sku.title}</Text>
              <Text variant="title">
                {sku.priceCents != null ? formatCents(sku.priceCents, sku.currency) : '—'}
              </Text>
            </View>
            {sku.creditAppliedCents > 0 ? (
              <Text variant="caption" color="success" style={{ marginTop: t.spacing.xs }}>
                Includes {formatCents(sku.creditAppliedCents, sku.currency)} credit for courses you already own
              </Text>
            ) : null}
          </Card>

          {isLive ? (
            <>
              <View style={{ height: t.spacing.xl }} />
              <Text variant="heading">Choose a class</Text>
              <View style={{ height: t.spacing.md }} />
              {loadingBatches ? (
                <ActivityIndicator color={t.colors.primary} />
              ) : !batches || batches.length === 0 ? (
                <Card>
                  <Text variant="body" color="mutedForeground">
                    No open classes right now. Check back soon.
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: t.spacing.sm }}>
                  {batches.map((batch) => (
                    <Pressable
                      key={batch.id}
                      onPress={() => setBatchId(batch.id)}
                      accessibilityRole="button"
                    >
                      <Card
                        style={
                          batchId === batch.id
                            ? { borderColor: t.colors.primary, borderWidth: 2 }
                            : undefined
                        }
                      >
                        <Text variant="label">{batch.name}</Text>
                        <Text variant="caption" color="mutedForeground">
                          Starts {new Date(batch.startDate).toLocaleDateString()}
                          {batch.leadTeacher ? ` · ${batch.leadTeacher.fullName}` : ''}
                          {batch.seatsLeft != null ? ` · ${batch.seatsLeft} seats left` : ''}
                        </Text>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : null}

          {sku.installmentsAvailable ? (
            <>
              <View style={{ height: t.spacing.xl }} />
              <Text variant="heading">How to pay</Text>
              <View style={{ height: t.spacing.md, flexDirection: 'row', gap: t.spacing.sm }} />
              <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                <PaymentOption
                  label="Pay in full"
                  sublabel={formatCents(sku.priceCents!, sku.currency)}
                  selected={billingMode === 'ONE_TIME'}
                  onPress={() => setBillingMode('ONE_TIME')}
                />
                <PaymentOption
                  label={`${sku.installmentCount} instalments`}
                  sublabel={`${formatCents(sku.amountPerInstallmentCents!, sku.currency)}/mo`}
                  selected={billingMode === 'INSTALLMENT'}
                  onPress={() => setBillingMode('INSTALLMENT')}
                />
              </View>
            </>
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
            title={`Unlock for ${sku.priceCents != null ? formatCents(sku.priceCents, sku.currency) : ''}`}
            onPress={handleUnlock}
            loading={startingCheckout}
            fullWidth
          />
          <Text
            variant="caption"
            color="mutedForeground"
            style={{ textAlign: 'center', marginTop: t.spacing.md }}
          >
            Opens Stripe&apos;s secure checkout in your browser.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function PaymentOption({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1 }}>
      <Card style={selected ? { borderColor: t.colors.primary, borderWidth: 2 } : undefined}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" color="mutedForeground">
          {sublabel}
        </Text>
      </Card>
    </Pressable>
  );
}

function centered(background: string) {
  return {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: background,
  };
}
