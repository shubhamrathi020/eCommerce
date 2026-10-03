import { DOCUMENT, registerLocaleData } from '@angular/common';
import localeHi from '@angular/common/locales/hi';
import { Injectable, PLATFORM_ID, afterNextRender, computed, inject, isDevMode, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { STORAGE } from '../tokens';
import { type MessageParams, formatMessage } from './message-format';
import { EN, type MessageKey } from './messages.en';
import { HI } from './messages.hi';

registerLocaleData(localeHi, 'hi');

export type LocaleCode = 'en' | 'hi' | 'rtl';

export interface LocaleInfo {
  code: LocaleCode;
  /** Name in its own language, for the menu. */
  label: string;
  /** Locale used for numbers, currency and plural rules. */
  intl: string;
  /** Locale id for Angular date formatting (locale data is registered above). */
  angular: string;
  /** Value of the `lang` attribute. */
  html: string;
  dir: 'ltr' | 'rtl';
  /** Translations are a draft without native-speaker review. */
  draft?: boolean;
  /** Only offered in development builds. */
  devOnly?: boolean;
}

export const LOCALES: readonly LocaleInfo[] = [
  { code: 'en', label: 'English', intl: 'en-IN', angular: 'en-US', html: 'en', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', intl: 'hi-IN', angular: 'hi', html: 'hi', dir: 'ltr', draft: true },
  // A layout test language (LX-03): English text, end-to-left direction, Arabic-script numerals. Not a real translation.
  { code: 'rtl', label: 'RTL layout test', intl: 'ar-EG', angular: 'en-US', html: 'ar', dir: 'rtl', devOnly: true },
];

const KEY = 'ecom.locale.v1';
const DICTIONARIES: Record<LocaleCode, Partial<Record<MessageKey, string>>> = { en: EN, hi: HI, rtl: EN };

/**
 * The shop's language (BRD 18). English on the server and for the first paint; the saved or browser language is applied right after
 * the page has hydrated, so the server and client markup always match. Setting a language updates every visible string at once,
 * the page `lang` and `dir`, and number, currency and date formats.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storage = inject(STORAGE);
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _locale = signal<LocaleCode>('en');
  readonly locale = this._locale.asReadonly();
  readonly info = computed(() => LOCALES.find((l) => l.code === this._locale()) as LocaleInfo);
  readonly dir = computed(() => this.info().dir);
  /** Languages the menu offers. */
  readonly available = LOCALES.filter((l) => !l.devOnly || isDevMode());

  constructor() {
    // After hydration, never during it: a server-rendered page and its first client render must be identical.
    if (this.browser) afterNextRender(() => this.restore());
  }

  /** Applies the saved language, else the browser's. A no-op on the server. */
  restore(): void {
    if (!this.browser) return;
    let saved: string | null = null;
    try {
      saved = this.storage.getItem(KEY);
    } catch {
      saved = null;
    }
    const wanted = this.available.find((l) => l.code === saved)?.code ?? this.fromBrowser();
    if (wanted !== this._locale()) this.apply(wanted);
  }

  /** The first browser-preferred language that the shop offers, else English. */
  private fromBrowser(): LocaleCode {
    const prefs = typeof navigator === 'undefined' ? [] : (navigator.languages?.length ? navigator.languages : [navigator.language]);
    for (const p of prefs) {
      const base = p.toLowerCase().split('-')[0];
      const hit = this.available.find((l) => l.html === base && !l.devOnly);
      if (hit) return hit.code;
    }
    return 'en';
  }

  /** Switches language and remembers the choice. */
  set(code: LocaleCode): void {
    if (!LOCALES.some((l) => l.code === code)) return;
    this.apply(code);
    try {
      this.storage.setItem(KEY, code);
    } catch {
      // Storage blocked: the choice lasts for this visit.
    }
  }

  private apply(code: LocaleCode): void {
    this._locale.set(code);
    const info = LOCALES.find((l) => l.code === code) as LocaleInfo;
    const root = this.doc.documentElement;
    root.setAttribute('lang', info.html);
    root.setAttribute('dir', info.dir);
  }

  /** Translates a key, falling back to English and then to the key itself so a gap is visible rather than blank. */
  t(key: MessageKey | string, params?: MessageParams): string {
    const code = this._locale();
    const template = DICTIONARIES[code][key as MessageKey] ?? EN[key as MessageKey];
    if (template === undefined) return key;
    return formatMessage(template, params, this.info().intl);
  }

  /** A number in the current locale's format (grouping, digits). Stored values are never changed. */
  number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.info().intl, options).format(value);
  }
}
