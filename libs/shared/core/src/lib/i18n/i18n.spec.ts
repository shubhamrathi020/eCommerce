import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { I18nService } from './i18n.service';
import { LocaleDatePipe } from './locale-date.pipe';
import { formatMessage } from './message-format';
import { EN } from './messages.en';
import { HI } from './messages.hi';
import { TranslatePipe } from './translate.pipe';

describe('message format', () => {
  it('fills in values and leaves no braces behind', () => {
    expect(formatMessage('Hello {name}, you have {n} items', { name: 'Asha', n: 3 })).toBe('Hello Asha, you have 3 items');
    expect(formatMessage('Hi {missing}!')).toBe('Hi !');
  });

  it('picks plural forms by the locale rules, with # standing for the formatted number', () => {
    const t = '{count, plural, =0 {No items} one {# item} other {# items}}';
    expect(formatMessage(t, { count: 0 })).toBe('No items');
    expect(formatMessage(t, { count: 1 })).toBe('1 item');
    expect(formatMessage(t, { count: 1234 }, 'en-IN')).toBe('1,234 items');
    expect(formatMessage(t, { count: 1234567 }, 'en-IN')).toBe('12,34,567 items'); // Indian grouping
    // Hindi treats 0 and 1 as "one".
    expect(formatMessage('{count, plural, one {# वस्तु} other {# वस्तुएँ}}', { count: 0 }, 'hi-IN')).toBe('0 वस्तु');
    expect(formatMessage('{count, plural, one {# वस्तु} other {# वस्तुएँ}}', { count: 2 }, 'hi-IN')).toBe('2 वस्तुएँ');
  });

  it('keeps a whole sentence in one message and survives nested text and unbalanced braces', () => {
    expect(formatMessage('{n, plural, one {You have # new message from {who}} other {You have # new messages from {who}}}', { n: 2, who: 'Ravi' })).toBe('You have 2 new messages from Ravi');
    expect(formatMessage('broken {oops')).toBe('broken {oops');
  });
});

describe('translations stay in step with English (LX-01)', () => {
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)(?:,|\})/g)].map((m) => m[1]).sort();

  it('Hindi defines every English key and nothing else', () => {
    expect(Object.keys(HI).sort()).toEqual(Object.keys(EN).sort());
  });

  it('uses the same placeholders in every language, and a plural wherever English has one', () => {
    for (const key of Object.keys(EN) as (keyof typeof EN)[]) {
      expect(placeholders(HI[key]), key).toEqual(placeholders(EN[key]));
      expect(/plural/.test(HI[key]), `${key} plural`).toBe(/plural/.test(EN[key]));
      expect(HI[key].trim(), key).not.toBe('');
    }
  });

  it('actually translates: no Hindi message is just the English text (apart from codes and brand words)', () => {
    const same = (Object.keys(EN) as (keyof typeof EN)[]).filter((k) => HI[k] === EN[k]);
    expect(same).toEqual([]);
  });

  /** Every literal key used in a template (`'key' | t`) or in code (`i18n.t('key')`) must exist, so a typo cannot ship as a visible key. */
  it('has an English entry for every key the source uses', () => {
    const root = resolve(import.meta.dirname, '../../../../../..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (['node_modules', 'dist', '.nx', '.git', 'coverage'].includes(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) files.push(p);
      }
    };
    walk(join(root, 'libs'));
    walk(join(root, 'apps', 'storefront', 'src'));
    const used = new Set<string>();
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/'([a-zA-Z]+\.[a-zA-Z.]+)'\s*\|\s*t\b/g)) used.add(m[1]);
      for (const m of text.matchAll(/\bi18n\.t\(\s*'([a-zA-Z]+\.[a-zA-Z.]+)'/g)) used.add(m[1]);
      for (const m of text.matchAll(/\bkey:\s*'((?:footer|nav|cart)\.[a-zA-Z.]+)'/g)) used.add(m[1]);
      for (const m of text.matchAll(/title:\s*'(footer\.[a-zA-Z]+)'/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(40);
    expect([...used].filter((k) => !(k in EN)).sort()).toEqual([]);
  });
});

@Component({
  selector: 'app-probe',
  imports: [TranslatePipe, LocaleDatePipe],
  template: `<p id="a">{{ 'cart.title' | t }}</p><p id="b">{{ 'nav.cart' | t: { count: n() } }}</p><p id="c">{{ when | date: 'd MMMM y' }}</p>`,
})
class ProbeComponent {
  n = signal(1);
  when = new Date('2026-10-03T10:00:00Z');
}

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('dir');
    document.documentElement.setAttribute('lang', 'en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('starts in English and translates, falling back to English and then to the key', () => {
    const i18n = TestBed.inject(I18nService);
    expect(i18n.t('cart.title')).toBe('Your cart');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
  });

  it('switches every string, the page language and direction, and remembers the choice', () => {
    const i18n = TestBed.inject(I18nService);
    i18n.set('hi');
    expect(i18n.t('cart.title')).toBe('आपका कार्ट');
    expect(document.documentElement.getAttribute('lang')).toBe('hi');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(localStorage.getItem('ecom.locale.v1')).toBe('hi');

    i18n.set('rtl');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(i18n.dir()).toBe('rtl');
    expect(i18n.t('cart.title')).toBe('Your cart'); // the layout test language reuses English text
    i18n.set('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('restores the saved language, else the browser language, and ignores unknown values', () => {
    localStorage.setItem('ecom.locale.v1', 'hi');
    const saved = TestBed.inject(I18nService);
    saved.restore();
    expect(saved.locale()).toBe('hi');

    localStorage.setItem('ecom.locale.v1', 'xx');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['hi-IN', 'en']);
    const fromBrowser = TestBed.inject(I18nService);
    fromBrowser.restore();
    expect(fromBrowser.locale()).toBe('hi');
    languages.mockRestore();
  });

  it('offers the RTL layout test language only in development builds, and labels Hindi a draft', () => {
    const i18n = TestBed.inject(I18nService);
    // Vitest runs in development mode, so the test language is offered here; production filtering is the same `devOnly` flag.
    expect(i18n.available.map((l) => l.code)).toEqual(['en', 'hi', 'rtl']);
    expect(i18n.available.find((l) => l.code === 'hi')?.draft).toBe(true);
  });

  it('formats numbers by locale without touching the value', () => {
    const i18n = TestBed.inject(I18nService);
    expect(i18n.number(1234567.5)).toBe('12,34,567.5');
    i18n.set('rtl');
    expect(i18n.number(1234)).toMatch(/[٠-٩]/); // Arabic-Indic digits
  });

  it('re-renders translated text, plurals and dates when the language changes, without recreating the component', async () => {
    const fixture = TestBed.createComponent(ProbeComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const text = (id: string) => el.querySelector(`#${id}`)?.textContent;
    expect(text('a')).toBe('Your cart');
    expect(text('b')).toBe('Cart, 1 item');
    expect(text('c')).toBe('3 October 2026');

    TestBed.inject(I18nService).set('hi');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(text('a')).toBe('आपका कार्ट');
    expect(text('b')).toBe('कार्ट, 1 वस्तु');
    expect(text('c')).toBe('3 अक्टूबर 2026');

    fixture.componentInstance.n.set(3);
    fixture.detectChanges();
    expect(text('b')).toBe('कार्ट, 3 वस्तुएँ');
  });
});
