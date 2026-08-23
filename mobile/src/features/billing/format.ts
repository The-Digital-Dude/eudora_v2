/**
 * Every price in the checkout flow (`resolve-sku`, `checkout-session`,
 * orders, entitlements) is integer minor units — `priceCents`, `totalCents` —
 * unlike `guardianApi.ts`'s invoices/payments, which carry decimal-string
 * amounts from a different part of the schema. Two formatters, not one,
 * because dividing a decimal-string amount by 100 would be a real bug, not a
 * style choice.
 */
export function formatCents(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
