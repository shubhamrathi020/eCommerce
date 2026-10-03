import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG } from '@ecom/shared/core';
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

async function violations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  const r = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 110)}`);
}

const button = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement | undefined;

describe('cart: automatic offers and gift cards', () => {
  it('shows each offer as its own saving line, then applies and removes a gift card', async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter(checkoutRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })] });
    const { products } = await loadCatalogData();
    const shirt = products.find((p) => p.id === 'p-0002')?.variants[0].id as string;
    const store = TestBed.inject(CartStore);
    await store.refresh();
    await store.add({ variantId: shirt, quantity: 1, openMiniCart: false });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/cart');
    await settle(harness);
    let root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Fashion fest');
    expect(root.textContent).toContain('10% off');
    expect(root.textContent).toContain('Welcome offer');
    expect(await violations(root)).toEqual([]);
    const before = store.cart()?.totals.total.amount as number;

    // A wrong code is refused beside the field; the right one reduces what is left to pay.
    const input = root.querySelector<HTMLInputElement>('input[name="giftcard"]') as HTMLInputElement;
    input.value = 'NOPE';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const applyButtons = () => Array.from(root.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'Apply');
    applyButtons()[applyButtons().length - 1].click();
    await settle(harness);
    expect(root.textContent).toContain('This gift card code is not valid.');

    root = harness.routeNativeElement as HTMLElement;
    const field = root.querySelector<HTMLInputElement>('input[name="giftcard"]') as HTMLInputElement;
    field.value = 'GIFT500';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    const apply = Array.from(root.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'Apply');
    apply[apply.length - 1].click();
    await settle(harness, 15);
    root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Gift card GIFT500 applied');
    expect(root.textContent).toContain('To pay');
    expect(store.cart()?.totals.total.amount).toBe(before - 50_000);
    expect(await violations(root)).toEqual([]);

    const panel = root.querySelector('section[aria-label="Gift card and store credit"]') as HTMLElement;
    button(panel, 'Remove')?.click();
    await settle(harness, 15);
    expect(store.cart()?.totals.total.amount).toBe(before);
  });
});
