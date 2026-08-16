import { authApi } from "../auth/authApi";

export type SkuType = "PROGRAM" | "COURSE";
export type BillingMode = "ONE_TIME" | "INSTALLMENT" | "SUBSCRIPTION";

export type SkuResolution =
  | "AVAILABLE"
  | "OWNED"
  | "UPGRADE"
  | "BLOCKED_ACTIVE_PLAN"
  | "NOT_SELLABLE";

/**
 * Everything price-related is computed server-side and simply displayed here.
 * The client never derives a price — that would let a crafted request pay an
 * amount of its own choosing.
 */
export interface ResolvedSku {
  resolution: SkuResolution;
  skuType: SkuType;
  skuId: string;
  title: string;
  currency: string;
  listPriceCents: number | null;
  priceCents: number | null;
  creditAppliedCents: number;
  overlappingCourseIds: string[];
  installmentsAvailable: boolean;
  installmentCount: number | null;
  amountPerInstallmentCents: number | null;
  finalInstallmentCents: number | null;
  message?: string;
}

export interface BatchOption {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  enrollmentDeadline: string | null;
  capacity: number | null;
  /** Null when capacity is unlimited. */
  seatsLeft: number | null;
  leadTeacher: { id: string; fullName: string } | null;
}

export interface OrderItemView {
  id: string;
  studentProfileId: string;
  billingMode: BillingMode;
  priceCents: number;
  installmentCount: number | null;
  creditAppliedCents: number;
  program: { id: string; name: string; slug: string } | null;
  course: { id: string; title: string; slug: string } | null;
  entitlement: { id: string; status: string } | null;
  plan: {
    installmentsPaid: number;
    installmentCount: number;
    status: string;
    paidThroughDate: string;
  } | null;
}

export interface OwnedEntitlement {
  id: string;
  status: "ACTIVE" | "PAST_DUE" | "EXPIRED" | "REVOKED";
  source: "PURCHASE" | "ADMIN_GRANT" | "TRIAL" | "PROMO";
  accessExpiresAt: string | null;
  paidThroughDate: string | null;
  program: { id: string; name: string; slug: string } | null;
  course: { id: string; title: string; slug: string } | null;
  courseClass: { id: string; name: string; endDate: string | null } | null;
  orderItem: {
    plan: {
      installmentsPaid: number;
      installmentCount: number;
      status: string;
      paidThroughDate: string;
      amountPerInstallmentCents: number;
    } | null;
  } | null;
}

export interface GuardianEntitlements {
  studentProfileId: string;
  fullName: string;
  entitlements: OwnedEntitlement[];
}

export interface AdminEntitlement {
  id: string;
  status: string;
  source: string;
  accessStartsAt: string;
  accessExpiresAt: string | null;
  paidThroughDate: string | null;
  note: string | null;
  createdAt: string;
  studentProfile: { id: string; fullName: string };
  program: { id: string; name: string } | null;
  course: { id: string; title: string } | null;
}

export interface OrderView {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  totalCents: number;
  currency: string;
  createdAt: string;
  items: OrderItemView[];
}

export const billingApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    resolveSku: builder.mutation<
      ResolvedSku,
      { studentProfileId: string; skuType: SkuType; skuId: string }
    >({
      query: (body) => ({ url: "/billing/resolve-sku", method: "POST", body }),
    }),

    createCheckoutSession: builder.mutation<
      { orderId: string; checkoutUrl: string | null },
      {
        studentProfileId: string;
        skuType: SkuType;
        skuId: string;
        billingMode: BillingMode;
        courseClassId?: string;
        successPath?: string;
        cancelPath?: string;
      }
    >({
      query: (body) => ({
        url: "/billing/checkout-session",
        method: "POST",
        body,
      }),
    }),

    /** Batches with seats left. Empty for a self-paced course. */
    getOpenBatches: builder.query<BatchOption[], string>({
      query: (courseId) => `/billing/courses/${courseId}/batches`,
    }),

    getOrder: builder.query<OrderView, string>({
      query: (id) => `/billing/orders/${id}`,
    }),

    /** What the guardian owns, grouped by child. */
    getMyEntitlements: builder.query<GuardianEntitlements[], void>({
      query: () => "/billing/my-entitlements",
    }),

    /** Hosted Stripe portal for card changes and plan cancellation. */
    createBillingPortal: builder.mutation<{ url: string }, { returnPath?: string }>({
      query: (body) => ({ url: "/billing/billing-portal", method: "POST", body }),
    }),

    // Admin support tooling: refunds, comps and access disputes all start here.
    searchEntitlements: builder.query<
      AdminEntitlement[],
      { query?: string; status?: string } | void
    >({
      query: (params: any) => {
        const q = new URLSearchParams();
        if (params?.query) q.set("query", params.query);
        if (params?.status) q.set("status", params.status);
        const qs = q.toString();
        return `/entitlements/search${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Entitlements" as any],
    } as any),

    grantEntitlement: builder.mutation<
      unknown,
      { studentProfileId: string; programId?: string; courseId?: string; note?: string }
    >({
      query: (body: any) => ({ url: "/entitlements/grant", method: "POST", body }),
      invalidatesTags: ["Entitlements" as any],
    } as any),

    revokeEntitlement: builder.mutation<unknown, { id: string; note?: string }>({
      query: ({ id, ...body }: any) => ({
        url: `/entitlements/${id}/revoke`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Entitlements" as any],
    } as any),

    getOrders: builder.query<OrderView[], void>({
      query: () => "/billing/orders",
    }),
  }),
});

export const {
  useResolveSkuMutation,
  useCreateCheckoutSessionMutation,
  useGetOpenBatchesQuery,
  useGetOrderQuery,
  useGetOrdersQuery,
  useGetMyEntitlementsQuery,
  useCreateBillingPortalMutation,
  useSearchEntitlementsQuery,
  useGrantEntitlementMutation,
  useRevokeEntitlementMutation,
} = billingApi;

/** Money crosses the wire as integer cents; format only for display. */
export function formatCents(cents: number | null, currency = "USD"): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
