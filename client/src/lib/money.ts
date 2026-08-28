/**
 * Money conversion for admin pricing forms.
 *
 * Prices are stored as integer cents everywhere — Stripe works in the smallest
 * currency unit, and floats round wrong. Forms take dollars because that is
 * what an admin thinks in, so the conversion happens once, at the boundary.
 *
 * Lives here rather than beside either form: programs and courses both price
 * themselves, and the rules must not drift apart between them.
 */

/** Dollars as typed into a form -> integer cents, or undefined when blank. */
export function dollarsToCents(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

/** Integer cents -> a dollars string for a form field. Null becomes blank. */
export function centsToDollars(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return (value / 100).toFixed(2);
}

/**
 * Mirrors MIN_SELLABLE_PRICE_CENTS on the API. Duplicated across the network
 * boundary by necessity — the form warns before submitting, the server is what
 * actually enforces it.
 */
export const MIN_SELLABLE_PRICE_CENTS = 900;

/**
 * The real installment schedule, matching `installmentSchedule` on the API:
 * the final payment absorbs the rounding remainder, so 10000 over 3 is
 * 3333 + 3333 + 3334 rather than three payments that do not add up.
 */
export function installmentPreview(
  totalCents: number | undefined,
  count: number,
): string | null {
  if (!totalCents || !Number.isFinite(count) || count < 2) return null;
  const base = Math.floor(totalCents / count);
  const final = totalCents - base * (count - 1);
  return `${count} x $${(base / 100).toFixed(2)} (final $${(final / 100).toFixed(2)})`;
}
