import { api } from '@/core/api/api';
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionPayload,
  FamilyChildEntitlements,
  OpenBatch,
  OrderRecord,
  ResolvedSku,
  ResolveSkuPayload,
} from '@/core/contracts';

/**
 * The purchase flow — resolving a price, opening Stripe Checkout, and
 * confirming the result. Distinct from `guardianApi.ts`'s `getInvoices`/
 * `getPayments`, which are a read-only ledger of what already happened; this
 * is what makes something happen. Every endpoint here is
 * `@Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')` server-side — a student
 * account (role USER) cannot reach any of it, matching decision 2: the
 * guardian buys, never the learner.
 */
export const checkoutApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /** Price summary before committing to anything — never invalidates or is
     * invalidated by other tags, since resolving a price has no side effect. */
    resolveSku: builder.mutation<ResolvedSku, ResolveSkuPayload>({
      query: (body) => ({ url: '/billing/resolve-sku', method: 'POST', body }),
    }),

    getOpenBatches: builder.query<OpenBatch[], string>({
      query: (courseId) => `/billing/courses/${courseId}/batches`,
    }),

    /**
     * Creates the pending Order and hands back Stripe's own hosted checkout
     * URL — open it with `Linking.openURL`, not a WebView; see
     * `CheckoutSessionResult`'s doc comment for why polling `orderId`
     * afterward is the only way mobile can learn the outcome.
     */
    createCheckoutSession: builder.mutation<
      CheckoutSessionResult,
      CreateCheckoutSessionPayload
    >({
      query: (body) => ({ url: '/billing/checkout-session', method: 'POST', body }),
    }),

    /**
     * The poll target. `pollingInterval` on the consuming `useQuery` call is
     * what drives re-fetching — React Native suspends JS timers while
     * backgrounded, so this naturally pauses while the guardian is in the
     * system browser and resumes the moment they return to the app, with no
     * AppState wiring needed.
     */
    getOrder: builder.query<OrderRecord, string>({
      query: (orderId) => `/billing/orders/${orderId}`,
      providesTags: (_r, _e, orderId) => [{ type: 'Orders', id: orderId }],
    }),

    /** Family-wide ownership, grouped by child — the "what do we own" view on `app/billing.tsx`. */
    getFamilyEntitlements: builder.query<FamilyChildEntitlements[], void>({
      query: () => '/billing/my-entitlements',
      providesTags: ['Entitlements'],
    }),
  }),
});

export const {
  useResolveSkuMutation,
  useGetOpenBatchesQuery,
  useCreateCheckoutSessionMutation,
  useGetOrderQuery,
  useGetFamilyEntitlementsQuery,
} = checkoutApi;
