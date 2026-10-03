import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '@ecom/shared/core';
import type { Money } from '@ecom/shared/models';
import { formatMoney } from './money';

/**
 * Formats money in the shop's current language (BRD 18, LX-02): grouping, digits and symbol placement follow the locale while the
 * stored amount (integer paise) never changes. Impure so a language change re-renders prices without recreating components.
 */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  // Impure pipes run on every change-detection pass, so remember the last answer for the same value and language.
  private lastValue: Money | null | undefined;
  private lastLocale = '';
  private lastResult = '';

  transform(value: Money | null | undefined): string {
    const locale = this.i18n.info().intl;
    if (value === this.lastValue && locale === this.lastLocale) return this.lastResult;
    this.lastValue = value;
    this.lastLocale = locale;
    this.lastResult = value ? formatMoney(value, locale) : '';
    return this.lastResult;
  }
}
