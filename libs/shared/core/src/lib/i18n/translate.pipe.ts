import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import type { MessageParams } from './message-format';

/**
 * `{{ 'cart.title' | t }}` or `{{ 'nav.cart' | t: { count: n } }}`. Impure on purpose: it reads the language signal when it runs,
 * so a language change re-renders every translated string without recreating components.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  private lastKey = '';
  private lastParams = '';
  private lastLocale = '';
  private lastResult = '';

  transform(key: string, params?: MessageParams): string {
    const locale = this.i18n.locale();
    const serialised = params ? JSON.stringify(params) : '';
    if (key === this.lastKey && serialised === this.lastParams && locale === this.lastLocale) return this.lastResult;
    this.lastKey = key;
    this.lastParams = serialised;
    this.lastLocale = locale;
    this.lastResult = this.i18n.t(key, params);
    return this.lastResult;
  }
}
