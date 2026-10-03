import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@ecom/shared/core';
import { provideDataAccess, loadCatalogData } from '@ecom/shared/data-access';
import { catalogRoutes, homeRoute } from './catalog.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };

async function open(url: string) {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([homeRoute, ...catalogRoutes], withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })] });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  for (let i = 0; i < 20; i++) {
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

describe('flash deals in the shop (PE-02)', () => {
  it('shows the live deal with a countdown and stock on the home page and on its product page only', async () => {
    const home = await open('/');
    const strip = home.querySelector('section[aria-labelledby="deals-h"]');
    expect(strip?.textContent).toContain('Flash deals');
    expect(strip?.textContent).toContain('20 left');
    expect(strip?.querySelector('ui-countdown')?.getAttribute('role')).toBe('timer');
    expect(await violations(home)).toEqual([]);

    const { products } = await loadCatalogData();
    const tee = products.find((p) => p.id === 'p-0001') as (typeof products)[number];
    const page = await open(`/p/${tee.slug}`);
    const banner = page.querySelector('section[aria-label="Flash deal"]');
    expect(banner?.textContent).toContain('Flash deal: signature tee');
    expect(banner?.textContent).toContain('20 of 20 left');
    expect(await violations(page)).toEqual([]);

    const other = products.find((p) => p.id === 'p-0002') as (typeof products)[number];
    expect((await open(`/p/${other.slug}`)).querySelector('section[aria-label="Flash deal"]')).toBeNull();
  }, 30_000);

  it('shows who sells a marketplace product, with their rating and policies, and nothing for the store own products', async () => {
    const { products } = await loadCatalogData();
    const owned = products.find((p) => p.id === 'p-0010') as (typeof products)[number];
    const page = await open(`/p/${owned.slug}`);
    const card = page.querySelector('section[aria-label="Seller"]');
    expect(card?.textContent).toContain('Sold by Urban Threads');
    expect(card?.textContent).toMatch(/seller rating from \d+ reviews/);
    expect(card?.textContent).toContain('Returns: 7-day returns');
    expect(card?.textContent).not.toMatch(/GSTIN|PAN|bank/i);
    expect(await violations(page)).toEqual([]);

    const live = await open('/p/handloom-cotton-kurta-sp-0001');
    expect(live.querySelector('section[aria-label="Seller"]')?.textContent).toContain('Sold by Urban Threads'); // a new listing shows its seller's rating

    const own = products.find((p) => p.id === 'p-0002') as (typeof products)[number];
    expect((await open(`/p/${own.slug}`)).querySelector('section[aria-label="Seller"]')).toBeNull();
  }, 30_000);
});
