/**
 * Pure money maths for checkout. No I/O, no Prisma, no Stripe — everything in
 * here is a function of its arguments so it can be unit-tested exhaustively.
 *
 * Every amount is an integer count of minor units (cents). Floats never touch
 * money: Stripe works in minor units and `0.1 + 0.2 !== 0.3`.
 */

/**
 * Minimum price for anything sellable, in minor units (cents).
 *
 * At Stripe's international rate (4.4% + $0.30) a $5 sale loses 10.4% to fees;
 * below roughly $9 the fee drag plus a single support interaction erases the
 * margin entirely. Standalone micro-courses are expected to sit at $19+.
 *
 * This is the only declaration. It was previously duplicated in
 * `institution/dto/program.dto.ts`, with checkout importing one copy and
 * program validation the other — they agreed by luck, not by construction.
 */
export const MIN_SELLABLE_PRICE_CENTS = 900;

/**
 * An upgrade credit can never wipe out more than this share of the program
 * price. Without a floor, someone who bought every course a la carte could
 * upgrade for nothing and pick up all future additions to that program free.
 */
export const MIN_UPGRADE_CHARGE_RATIO = 0.3;

/**
 * Splits a total into `count` installments.
 *
 * The first `count - 1` are `floor(total / count)` and the final one absorbs
 * the remainder, so the schedule always sums exactly to the total:
 * 10000 over 3 is [3333, 3333, 3334], not 3 x 3333.33.
 */
export function installmentSchedule(
  totalCents: number,
  count: number,
): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error('totalCents must be a non-negative integer');
  }
  if (!Number.isInteger(count) || count < 2) {
    throw new Error('installment count must be an integer >= 2');
  }

  const base = Math.floor(totalCents / count);
  const schedule = Array.from({ length: count - 1 }, () => base);
  schedule.push(totalCents - base * (count - 1));
  return schedule;
}

export interface InstallmentTerms {
  amountPerInstallmentCents: number;
  finalInstallmentCents: number;
  installmentCount: number;
  totalCents: number;
}

export function installmentTerms(
  totalCents: number,
  count: number,
): InstallmentTerms {
  const schedule = installmentSchedule(totalCents, count);
  return {
    amountPerInstallmentCents: schedule[0],
    finalInstallmentCents: schedule[schedule.length - 1],
    installmentCount: count,
    totalCents,
  };
}

/**
 * Price of upgrading into a program while already owning some of its courses.
 *
 * Credits what was paid for the overlap, floored so the buyer always pays a
 * meaningful share. Never returns a negative number and never triggers a
 * refund — a credit only ever reduces the current charge.
 */
export function upgradePrice(
  programPriceCents: number,
  alreadyPaidCents: number,
): { priceCents: number; creditAppliedCents: number } {
  if (alreadyPaidCents <= 0) {
    return { priceCents: programPriceCents, creditAppliedCents: 0 };
  }

  const floorPrice = Math.ceil(programPriceCents * MIN_UPGRADE_CHARGE_RATIO);
  const naivePrice = programPriceCents - alreadyPaidCents;
  const priceCents = Math.max(floorPrice, naivePrice);

  return {
    priceCents,
    creditAppliedCents: programPriceCents - priceCents,
  };
}

/**
 * Whether a monthly price should be offered at all. Deliberately derived from
 * the SKU's own fields rather than stored, so a stored flag can never disagree
 * with the prices actually set.
 */
export function offersInstallments(sku: {
  priceMonthlyCents: number | null;
  installmentCount: number | null;
}): boolean {
  return !!sku.priceMonthlyCents && !!sku.installmentCount;
}
