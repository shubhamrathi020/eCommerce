import type { Money } from './money';

/** Formats minor units as currency, e.g. 129900 paise -> "₹1,299". Whole amounts drop decimals.
 * Lives here (not just in `@ecom/shared/util`) so `apps/api` can build the same human-readable
 * notices the mock does, without pulling in an Angular-oriented shared lib. */
export function formatMoney(money: Money, locale = 'en-IN'): string {
  const major = money.amount / 100;
  const whole = money.amount % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(major);
}

/** Whole-number percentage discount of `price` versus `mrp`; 0 when it is under 1%. */
export function discountPercent(price: Money, mrp?: Money): number {
  if (!mrp || mrp.amount <= 0 || price.amount >= mrp.amount) return 0;
  const pct = Math.round(((mrp.amount - price.amount) / mrp.amount) * 100);
  return pct >= 1 ? pct : 0;
}
