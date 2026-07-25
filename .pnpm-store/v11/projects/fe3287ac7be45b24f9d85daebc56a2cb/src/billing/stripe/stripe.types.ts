/**
 * Stripe resource types.
 *
 * stripe@22's CommonJS type entry (`cjs/stripe.cjs.node.d.ts`) does
 * `export = StripeConstructor`, and that namespace only re-exports the client
 * instance type — the resource types (`Stripe.Subscription`, `Stripe.Invoice`,
 * …) live in a namespace that the package's `exports` map makes unreachable
 * under `moduleResolution: nodenext`. So `Stripe.Subscription` does not resolve
 * here, and deep-importing the core module is blocked.
 *
 * We therefore derive the resource types from the client's own method
 * signatures, which are reachable. These are the real SDK types — not
 * hand-written stand-ins — so schema drift still fails the build, which is the
 * whole point of not using `any`.
 */
import type { Stripe as StripeClient } from 'stripe';

/** Stripe wraps returned resources with `lastResponse`; strip it for payloads. */
type Unwrap<T> = T extends { lastResponse: any } ? Omit<T, 'lastResponse'> : T;

export type StripeSubscription = Unwrap<
  Awaited<ReturnType<StripeClient['subscriptions']['retrieve']>>
>;

export type StripeInvoice = Unwrap<
  Awaited<ReturnType<StripeClient['invoices']['retrieve']>>
>;

export type StripeCheckoutSession = Unwrap<
  Awaited<ReturnType<StripeClient['checkout']['sessions']['retrieve']>>
>;

export type StripeEvent = ReturnType<StripeClient['webhooks']['constructEvent']>;

export type StripePrice = Unwrap<
  Awaited<ReturnType<StripeClient['prices']['retrieve']>>
>;

export type { StripeClient };
