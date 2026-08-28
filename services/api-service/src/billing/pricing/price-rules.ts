import { BadRequestException } from '@nestjs/common';
import { MIN_SELLABLE_PRICE_CENTS } from './pricing';

/**
 * Validation shared by everything that can carry a price.
 *
 * Kept out of `pricing.ts` on purpose: that module documents itself as pure
 * money maths with no framework dependency, so the rules that throw HTTP
 * exceptions live here instead and import the constants from it.
 *
 * Structural rather than DTO-typed, so Program and Course — which declare the
 * same price fields on unrelated classes — can share one implementation
 * instead of drifting apart.
 */
export interface PricedSkuDraft {
  priceOneTimeCents?: number;
  priceMonthlyCents?: number;
  installmentCount?: number;
}

/**
 * Rejects prices below the floor rather than silently accepting them: a sub-$9
 * SKU loses ~10% to Stripe's fixed fee and cannot carry its own support cost.
 *
 * Zero and omitted both mean "not sold at this price point" and are allowed —
 * a course sold only inside a program has no standalone price of its own.
 */
export function assertPriceFloor(draft: PricedSkuDraft): void {
  for (const [field, value] of [
    ['priceOneTimeCents', draft.priceOneTimeCents],
    ['priceMonthlyCents', draft.priceMonthlyCents],
  ] as const) {
    if (value !== undefined && value > 0 && value < MIN_SELLABLE_PRICE_CENTS) {
      throw new BadRequestException(
        `${field} must be at least ${MIN_SELLABLE_PRICE_CENTS} cents (or 0 / omitted for "not sold")`,
      );
    }
  }

  // A monthly price with no schedule length is unchargeable: the installment
  // maths needs a count to split against, and Stripe needs a `cancel_at` so
  // the plan self-terminates rather than billing forever.
  if (draft.priceMonthlyCents && !draft.installmentCount) {
    throw new BadRequestException(
      'installmentCount is required when priceMonthlyCents is set',
    );
  }
}
