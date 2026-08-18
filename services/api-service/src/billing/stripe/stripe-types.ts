import type StripeSDK from 'stripe';

/**
 * Stripe v22 ships `export = StripeConstructor`, whose namespace exposes only
 * the client type — the resource types (`Checkout.Session`, `Invoice`, …) live
 * in an internal module that has no public subpath export.
 *
 * Rather than deep-importing `stripe/cjs/stripe.core.js`, which would break on
 * any packaging change, these aliases are derived from the client's own method
 * signatures. They stay correct automatically across SDK upgrades.
 */
type StripeClient = InstanceType<typeof StripeSDK>;

export type StripeEvent = ReturnType<
  StripeClient['webhooks']['constructEvent']
>;

export type StripeCheckoutSession = Awaited<
  ReturnType<StripeClient['checkout']['sessions']['create']>
>;

export type StripeInvoice = Awaited<
  ReturnType<StripeClient['invoices']['retrieve']>
>;

export type StripeSubscription = Awaited<
  ReturnType<StripeClient['subscriptions']['retrieve']>
>;
