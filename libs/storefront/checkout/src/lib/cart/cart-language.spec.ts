import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG, I18nService } from '@ecom/shared/core';
import { loadCatalogData, provideDataAccess } from '@ecom/shared/data-access';
import { CartStore } from '@ecom/shared/state';
import { checkoutRoutes } from '../checkout.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };

async function settle(h: RouterTestingHarness, rounds = 12) {
  for (let i = 0; i < rounds; i++) {
    await h.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    h.detectChanges();
  }
}

describe('cart page in another language (BRD 18)', () => {
  it('shows labels, plurals and prices in Hindi without changing a single stored amount', async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter(checkoutRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })] });
    const { products } = await loadCatalogData();
    const store = TestBed.inject(CartStore);
    await store.refresh();
    await store.add({ variantId: products.find((p) => p.id === 'p-0002')?.variants[0].id as string, quantity: 2, openMiniCart: false });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/cart');
    await settle(harness);
    const el = harness.routeNativeElement as HTMLElement;
    const english = el.textContent as string;
    expect(english).toContain('Your cart');
    expect(english).toContain('Proceed to checkout');
    const total = store.cart()?.totals.total.amount as number;

    TestBed.inject(I18nService).set('hi');
    await settle(harness, 4);
    const hindi = el.textContent as string;
    expect(el.querySelector('h1')?.textContent).toBe('आपका कार्ट');
    expect(hindi).toContain('चेकआउट पर जाएँ');
    expect(hindi).toContain('सामान (2)');
    expect(hindi).toContain('जीएसटी सहित');
    expect(hindi).toContain('कूपन कोड');
    expect(hindi).toContain('गिफ़्ट कार्ड कोड');
    expect(hindi).not.toContain('Proceed to checkout');
    expect(hindi).not.toContain('Coupon code');
    // The amounts are formatted for the locale, never recomputed.
    expect(store.cart()?.totals.total.amount).toBe(total);
    expect(hindi).toMatch(/₹[\d,]+/);

    const results = await (async () => {
      document.body.appendChild(el);
      return axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    })();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  });
});
