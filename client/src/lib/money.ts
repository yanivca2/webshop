/**
 * Money helpers.
 *
 * Every money value on the wire is an integer count of the currency's
 * smallest unit (minor units, e.g. cents) rather than a decimal amount -
 * see `Product.priceMinorUnits` in `client/src/types/api.ts`. Summing and
 * multiplying integers can't accumulate the binary float error decimal
 * arithmetic would (0.1 + 0.2 !== 0.3); `fromMinorUnits` is the one place a
 * decimal amount gets produced at all, right before formatting for display.
 *
 * These totals are for display only. The server reprices every purchase from
 * the catalog, so a rounding disagreement can never affect what is charged.
 */

const MINOR_UNITS_PER_MAJOR_UNIT = 100;

function fromMinorUnits(minorUnits: number): number {
  return minorUnits / MINOR_UNITS_PER_MAJOR_UNIT;
}

/** `priceMinorUnits * quantity` for one line, in minor units. */
export function lineTotal(priceMinorUnits: number, quantity: number): number {
  return priceMinorUnits * quantity;
}

/** Sum of `priceMinorUnits * quantity` across lines, in minor units. */
export function sumLineTotals(
  lines: readonly { priceMinorUnits: number; quantity: number }[],
): number {
  return lines.reduce((total, line) => total + line.priceMinorUnits * line.quantity, 0);
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatPrice(minorUnits: number): string {
  return currencyFormatter.format(fromMinorUnits(minorUnits));
}
