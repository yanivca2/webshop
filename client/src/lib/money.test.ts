import { describe, expect, it } from 'vitest';
import { formatPrice, lineTotal, sumLineTotals } from './money';

describe('money', () => {
  it('multiplies a line in minor units', () => {
    expect(lineTotal(27999, 3)).toBe(83997);
  });

  it('sums lines in minor units', () => {
    expect(
      sumLineTotals([
        { priceMinorUnits: 27999, quantity: 2 },
        { priceMinorUnits: 129900, quantity: 1 },
      ]),
    ).toBe(185898);
  });

  it('treats an empty basket as zero', () => {
    expect(sumLineTotals([])).toBe(0);
  });

  it('formats minor units as US currency', () => {
    expect(formatPrice(185898)).toBe('$1,858.98');
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats a single minor unit correctly', () => {
    expect(formatPrice(1)).toBe('$0.01');
  });
});
