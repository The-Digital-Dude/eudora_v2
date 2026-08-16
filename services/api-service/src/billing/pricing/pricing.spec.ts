import {
  MIN_UPGRADE_CHARGE_RATIO,
  installmentSchedule,
  installmentTerms,
  offersInstallments,
  upgradePrice,
} from './pricing';

describe('installmentSchedule', () => {
  it('splits evenly when the total divides cleanly', () => {
    expect(installmentSchedule(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it('puts the rounding remainder in the final installment', () => {
    // The demo SKU: $100 over 3 months.
    expect(installmentSchedule(10000, 3)).toEqual([3333, 3333, 3334]);
  });

  it('always sums back to exactly the total', () => {
    for (let total = 900; total <= 20000; total += 137) {
      for (let count = 2; count <= 12; count += 1) {
        const schedule = installmentSchedule(total, count);
        expect(schedule).toHaveLength(count);
        expect(schedule.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });

  it('never produces a fractional amount', () => {
    for (const schedule of [
      installmentSchedule(10000, 3),
      installmentSchedule(4999, 7),
      installmentSchedule(1, 2),
    ]) {
      for (const amount of schedule) {
        expect(Number.isInteger(amount)).toBe(true);
      }
    }
  });

  it('rejects counts below two and non-integer totals', () => {
    expect(() => installmentSchedule(10000, 1)).toThrow();
    expect(() => installmentSchedule(10000, 0)).toThrow();
    expect(() => installmentSchedule(100.5, 3)).toThrow();
    expect(() => installmentSchedule(-100, 3)).toThrow();
  });
});

describe('installmentTerms', () => {
  it('reports the per-installment and final amounts', () => {
    expect(installmentTerms(10000, 3)).toEqual({
      amountPerInstallmentCents: 3333,
      finalInstallmentCents: 3334,
      installmentCount: 3,
      totalCents: 10000,
    });
  });
});

describe('upgradePrice', () => {
  it('charges full price when nothing is already owned', () => {
    expect(upgradePrice(10000, 0)).toEqual({
      priceCents: 10000,
      creditAppliedCents: 0,
    });
  });

  it('credits what was already paid for the overlap', () => {
    expect(upgradePrice(10000, 1900)).toEqual({
      priceCents: 8100,
      creditAppliedCents: 1900,
    });
  });

  it('floors the charge so a full-catalogue owner still pays', () => {
    // Owning more than the program is worth must not produce a free upgrade,
    // otherwise future additions to the program come free too.
    const { priceCents, creditAppliedCents } = upgradePrice(10000, 99999);
    expect(priceCents).toBe(Math.ceil(10000 * MIN_UPGRADE_CHARGE_RATIO));
    expect(priceCents).toBe(3000);
    expect(creditAppliedCents).toBe(7000);
  });

  it('never returns a negative price or over-credits', () => {
    for (let paid = 0; paid <= 30000; paid += 500) {
      const { priceCents, creditAppliedCents } = upgradePrice(10000, paid);
      expect(priceCents).toBeGreaterThan(0);
      expect(priceCents + creditAppliedCents).toBe(10000);
    }
  });
});

describe('offersInstallments', () => {
  it('requires both a monthly price and a count', () => {
    expect(
      offersInstallments({ priceMonthlyCents: 3333, installmentCount: 3 }),
    ).toBe(true);
    expect(
      offersInstallments({ priceMonthlyCents: 3333, installmentCount: null }),
    ).toBe(false);
    expect(
      offersInstallments({ priceMonthlyCents: null, installmentCount: 3 }),
    ).toBe(false);
  });
});
