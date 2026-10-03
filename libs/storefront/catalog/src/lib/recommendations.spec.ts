import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG, AnalyticsService, ConsentService } from '@ecom/shared/core';
import { MockEventStore, loadCatalogData, provideDataAccess, seedEvents } from '@ecom/shared/data-access';
import { coPurchases } from '@ecom/contracts';
import { catalogRoutes, homeRoute } from './catalog.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };

async function open(url: string, prepare?: () => void) {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([homeRoute, ...catalogRoutes], withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })] });
  prepare?.();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  for (let i = 0; i < 25; i++) {
    await harness.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 25));
    harness.detectChanges();
  }
  return harness.routeNativeElement as HTMLElement;
}

async function violations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  const r = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
}

describe('recommendations in the shop (BRD 15)', () => {
  it('home shows popular rows for a new visitor, each saying why, plus a link to the privacy choices', async () => {
    const home = await open('/');
    const popular = home.querySelector('section[data-strategy="personalised"]');
    expect(popular?.getAttribute('aria-label')).toBe('Popular right now');
    expect(popular?.textContent).toContain('Popular with shoppers right now');
    expect(home.querySelector('section[data-strategy="trending"]')?.textContent).toMatch(/views and \d+ adds this week/);
    expect(home.querySelector('section[data-strategy="best_sellers"]')?.textContent).toMatch(/\d+ sold this month/);
    expect(home.querySelector('a[href="/personalisation"]')).not.toBeNull();
    expect(await violations(home)).toEqual([]);
  });

  it('home personalises after the shopper views products with analytics accepted', async () => {
    const { products } = await loadCatalogData();
    const cookware = products.filter((p) => p.categoryId === 'cat-cookware').slice(0, 4);
    const home = await open('/', () => {
      TestBed.inject(ConsentService).set('all');
      const analytics = TestBed.inject(AnalyticsService);
      for (const p of cookware) {
        analytics.track({ name: 'product_view', props: { productId: p.id } });
        analytics.track({ name: 'add_to_cart', props: { productId: p.id, quantity: 1 } });
      }
    });
    const mine = home.querySelector('section[data-strategy="personalised"]');
    expect(mine?.getAttribute('aria-label')).toBe('Recommended for you');
    expect(mine?.textContent).toContain('Because you looked at');
  });

  it('product page shows similar and bought-together rows without the product itself', async () => {
    const { products } = await loadCatalogData();
    const demo = seedEvents(products, Date.now());
    const purchased = [...new Set(demo.filter((e) => e.name === 'purchase').map((e) => e.props?.['productId'] as string))];
    const bestId = purchased.map((id) => ({ id, top: Math.max(0, ...coPurchases(demo, id).values()) })).sort((a, b) => b.top - a.top || a.id.localeCompare(b.id))[0].id;
    const product = products.find((p) => p.id === bestId) as (typeof products)[number];
    const page = await open(`/p/${product.slug}`);
    expect(page.querySelector('section[data-strategy="similar"]')).not.toBeNull();
    expect(page.querySelector('section[data-strategy="bought_together"]')?.textContent).toMatch(/Bought together in \d+ orders/);
    for (const link of Array.from(page.querySelectorAll<HTMLAnchorElement>('section[data-strategy] a[href^="/p/"]'))) expect(link.getAttribute('href')).not.toBe(`/p/${product.slug}`);
    expect(await violations(page)).toEqual([]);
  });

  it('viewing a product records an event only with consent', async () => {
    const { products } = await loadCatalogData();
    const p = products[3];
    await open(`/p/${p.slug}`);
    expect(TestBed.inject(MockEventStore).recorded()).toEqual([]);
    await open(`/p/${p.slug}`, () => TestBed.inject(ConsentService).set('all'));
    expect(TestBed.inject(MockEventStore).recorded().map((e) => e.name)).toEqual(['product_view']);
  });

  it('counts a click on a search result toward that search term, and ignores other links', async () => {
    const page = await open('/search?q=shirt', () => TestBed.inject(ConsentService).set('all'));
    const names = () => TestBed.inject(MockEventStore).recorded().map((e) => e.name);
    expect(names()).toContain('search');
    page.querySelector<HTMLAnchorElement>('a[href^="/c/"]')?.click(); // a breadcrumb or category link, not a result
    expect(names()).not.toContain('search_result_click');
    page.querySelector<HTMLAnchorElement>('[data-results] a[href^="/p/"]')?.click();
    const click = TestBed.inject(MockEventStore).recorded().find((e) => e.name === 'search_result_click');
    expect(click?.props).toEqual({ term: 'shirt' });
  });
});
