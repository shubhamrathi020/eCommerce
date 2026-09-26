import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@ecom/shared/core';
import { provideDataAccess } from '@ecom/shared/data-access';
import { catalogRoutes, homeRoute } from './catalog.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };

/** Structure/ARIA violations only: jsdom cannot compute colours or layout. */
async function seriousViolations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
}

async function open(url: string) {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([homeRoute, ...catalogRoutes], withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  // Mock data loads through dynamic imports, so allow the resources to settle.
  for (let i = 0; i < 20; i++) {
    await harness.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 25));
    harness.detectChanges();
  }
  return { harness, el: harness.routeNativeElement as HTMLElement };
}

describe('catalog pages', () => {
  it('home renders banners, categories and product rows', async () => {
    const { el } = await open('/');
    expect(el.querySelector('app-hero-carousel')).not.toBeNull();
    expect(el.querySelectorAll('section[aria-label="Shop by category"] li')).toHaveLength(8);
    expect(el.querySelectorAll('ui-product-card').length).toBeGreaterThan(10);
  });

  it('category listing shows facets, filters by brand from the URL and sorts', async () => {
    const { el } = await open('/c/mobiles?brand=nova&sort=price-asc');
    expect(el.querySelector('h1')?.textContent).toBe('Mobiles');
    const cards = el.querySelectorAll('ui-product-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(Array.from(cards).every((c) => c.textContent?.includes('Nova'))).toBe(true);
    expect(el.querySelector('ui-chip')?.textContent).toContain('Brand: Nova');
    const prices = Array.from(el.querySelectorAll('ui-product-card ui-price span.text-lg')).map((n) => Number((n.textContent ?? '').replace(/[^\d]/g, '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('unknown category shows the not-found page', async () => {
    const { el } = await open('/c/does-not-exist');
    expect(el.textContent).toContain('We could not find that page');
  });

  it('product page lets the shopper switch variants and updates price, SKU and URL', async () => {
    const list = await open('/c/laptops');
    const href = list.el.querySelector('ui-product-card h3 a')?.getAttribute('href') ?? '';
    expect(href).toMatch(/^\/p\//);
    TestBed.resetTestingModule();
    const { harness, el } = await open(href);
    expect(el.querySelector('h1')).not.toBeNull();
    const radios = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="radio"]')).filter((r) => r.getAttribute('aria-checked') === 'false' && !r.disabled);
    expect(radios.length).toBeGreaterThan(0);
    const before = el.textContent?.match(/SKU [\w-]+/)?.[0];
    radios[0].click();
    for (let i = 0; i < 5; i++) {
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
    expect(el.textContent?.match(/SKU [\w-]+/)?.[0]).not.toBe(before);
    expect(document.getElementById('seo-jsonld')?.textContent).toContain('"Product"');
  });

  it('unknown product shows the not-found page', async () => {
    const { el } = await open('/p/nope');
    expect(el.textContent).toContain('We could not find that page');
  });

  it('has no serious accessibility violations on home, listing and product pages', async () => {
    expect(await seriousViolations((await open('/')).el)).toEqual([]);
    TestBed.resetTestingModule();
    const listing = await open('/c/footwear');
    expect(await seriousViolations(listing.el)).toEqual([]);
    const href = listing.el.querySelector('ui-product-card h3 a')?.getAttribute('href') ?? '';
    TestBed.resetTestingModule();
    expect(await seriousViolations((await open(href)).el)).toEqual([]);
  }, 30000);

  it('search page: relevance sort by default, typo tolerance, corrected-query notice and zero-result help', async () => {
    const found = await open('/search?q=sneekers');
    expect(found.el.querySelector('h1')?.textContent).toContain('sneekers');
    expect(found.el.querySelectorAll('ui-product-card').length).toBeGreaterThan(0);
    const sort = found.el.querySelector('select');
    expect(sort?.value).toBe('relevance');
    expect(Array.from(found.el.querySelectorAll('#sort option')).map((o) => o.textContent)).toContain('Relevance');
    expect(found.el.textContent).not.toContain('No exact matches');

    TestBed.resetTestingModule();
    const corrected = await open('/search?q=tvx');
    expect(corrected.el.textContent).toContain('No exact matches for “tvx”');
    expect(corrected.el.querySelectorAll('ui-product-card').length).toBeGreaterThan(0);

    TestBed.resetTestingModule();
    const none = await open('/search?q=qzqzqz');
    expect(none.el.textContent).toContain('No results for “qzqzqz”');
    expect(none.el.textContent).toContain('Popular searches');
    expect(none.el.querySelectorAll('a[href^="/search?q="]').length).toBeGreaterThan(3);
    expect(await seriousViolations(none.el)).toEqual([]);
  }, 30000);

  it('category pages do not offer the relevance sort', async () => {
    const { el } = await open('/c/laptops');
    expect(Array.from(el.querySelectorAll('#sort option')).map((o) => o.textContent)).not.toContain('Relevance');
  });
});
