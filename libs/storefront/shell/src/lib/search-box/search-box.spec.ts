import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import axe from 'axe-core';
import { APP_CONFIG, RecentSearchesStore } from '@ecom/shared/core';
import { provideDataAccess } from '@ecom/shared/data-access';
import { SearchBoxComponent } from './search-box';

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SearchBoxComponent],
    providers: [provideZonelessChangeDetection(), provideRouter([{ path: '**', children: [] }]), { provide: APP_CONFIG, useValue: { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'S', siteUrl: 'http://x', features: {} } }, provideDataAccess({ useMocks: true })],
  }).compileComponents();
  const fixture = TestBed.createComponent(SearchBoxComponent);
  fixture.componentRef.setInput('idPrefix', 't');
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector('input') as HTMLInputElement;
  return { fixture, el, input };
}

async function type(fixture: Awaited<ReturnType<typeof setup>>['fixture'], input: HTMLInputElement, value: string) {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 40));
    await fixture.whenStable();
  }
}

const key = (input: HTMLElement, k: string) => input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('SearchBoxComponent', () => {
  it('is an accessible combobox that lists suggestions after a short pause', async () => {
    const { fixture, el, input } = await setup();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    await type(fixture, input, 'lap');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const options = el.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(2);
    expect(el.textContent).toContain('Products');
    const results = await axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  it('moves with arrow keys, selects with Enter, and closes with Escape', async () => {
    const { fixture, el, input } = await setup();
    await type(fixture, input, 'lap');
    key(input, 'ArrowDown');
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('t-opt-0');
    expect(el.querySelector('[role="option"][aria-selected="true"]')).not.toBeNull();
    key(input, 'Escape');
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('submitting searches, saves the term as recent and navigates', async () => {
    const { fixture, el, input } = await setup();
    const router = TestBed.inject(Router);
    await type(fixture, input, 'sneakers');
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    expect(router.url).toContain('/search?q=sneakers');
    expect(TestBed.inject(RecentSearchesStore).ids()).toEqual(['sneakers']);
  });

  it('shows recent searches when the empty box is focused', async () => {
    const { fixture, el, input } = await setup();
    TestBed.inject(RecentSearchesStore).add('yoga mat');
    input.focus();
    input.dispatchEvent(new Event('focus'));
    await type(fixture, input, '');
    expect(el.textContent).toContain('Recent searches');
    expect(el.textContent).toContain('yoga mat');
  });

  it('picking a product suggestion navigates to it', async () => {
    const { fixture, el, input } = await setup();
    const router = TestBed.inject(Router);
    await type(fixture, input, 'lap');
    const product = Array.from(el.querySelectorAll<HTMLElement>('[role="option"]')).find((o) => o.querySelector('img'));
    expect(product).toBeDefined();
    product?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    expect(router.url).toMatch(/^\/p\//);
  });
});
