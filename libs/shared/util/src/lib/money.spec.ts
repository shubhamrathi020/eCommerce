import { discountPercent, formatMoney } from './money';

describe('money', () => {
  it('formats whole rupees without decimals', () => {
    expect(formatMoney({ amount: 129900, currency: 'INR' })).toBe('₹1,299');
  });

  it('keeps paise when present', () => {
    expect(formatMoney({ amount: 129950, currency: 'INR' })).toBe('₹1,299.50');
  });

  it('computes discount percent', () => {
    const price = { amount: 75000, currency: 'INR' as const };
    const mrp = { amount: 100000, currency: 'INR' as const };
    expect(discountPercent(price, mrp)).toBe(25);
  });

  it('returns 0 when there is no discount or MRP', () => {
    const price = { amount: 100000, currency: 'INR' as const };
    expect(discountPercent(price)).toBe(0);
    expect(discountPercent(price, price)).toBe(0);
  });

  it('hides sub-1% discounts', () => {
    expect(discountPercent({ amount: 99900, currency: 'INR' }, { amount: 100000, currency: 'INR' })).toBe(0);
  });
});
