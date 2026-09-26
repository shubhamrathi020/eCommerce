import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, ToastService } from '@ecom/shared/core';
import { CatalogApi, provideDataAccess } from '@ecom/shared/data-access';
import { firstValueFrom } from 'rxjs';
import { CartStore } from './cart.store';

describe('CartStore', () => {
  let store: CartStore;
  let variantId: string;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: APP_CONFIG, useValue: { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'S', siteUrl: 'http://x', features: {} } }, provideDataAccess({ useMocks: true })],
    });
    const catalog = TestBed.inject(CatalogApi);
    const list = await firstValueFrom(catalog.listing({ filters: {}, sort: 'featured', page: 1, pageSize: 50 }));
    const found = (await firstValueFrom(catalog.productsByIds(list.items.map((i) => i.id)))).flatMap((p) => p.variants).find((v) => v.stock >= 20);
    variantId = found?.id ?? '';
    store = TestBed.inject(CartStore);
    await store.refresh();
  });

  it('starts empty, adds items, opens the mini-cart and reports counts', async () => {
    expect(store.isEmpty()).toBe(true);
    expect(await store.add({ productId: 'x', variantId, quantity: 2, title: 'T' })).toBe(true);
    expect(store.count()).toBe(2);
    expect(store.miniCartOpen()).toBe(true);
  });

  it('does not open the mini-cart for buy now', async () => {
    await store.add({ productId: 'x', variantId, quantity: 1, title: 'T', openMiniCart: false });
    expect(store.miniCartOpen()).toBe(false);
  });

  it('shows an error toast and resolves false when adding fails', async () => {
    const toast = TestBed.inject(ToastService);
    expect(await store.add({ productId: 'x', variantId: 'missing', quantity: 1, title: 'T' })).toBe(false);
    expect(toast.toasts().at(-1)?.kind).toBe('error');
  });

  it('updates quantity, coupons and shipping, and reports validation messages', async () => {
    await store.add({ productId: 'x', variantId, quantity: 1, title: 'T' });
    expect((await store.setQuantity(variantId, 3)).ok).toBe(true);
    expect(store.count()).toBe(3);
    const bad = await store.applyCoupon('nope');
    expect(bad.ok).toBe(false);
    expect(bad.message).toContain('not valid');
    expect((await store.setShippingMethod('express')).ok).toBe(true);
    expect(store.cart()?.shippingMethod).toBe('express');
    expect((await store.remove(variantId, 'T')).ok).toBe(true);
    expect(store.isEmpty()).toBe(true);
  });
});
