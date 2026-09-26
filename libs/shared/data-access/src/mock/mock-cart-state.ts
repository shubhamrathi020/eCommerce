import { Injectable, inject } from '@angular/core';
import { STORAGE } from '@ecom/shared/core';
import { loadCatalogData } from './catalog-data';
import { EMPTY_STORED_CART, type PricedCart, type StoredCart, priceCart } from './cart-engine';

const KEY = 'ecom.mock.cart.v1';

/** Device-local cart storage for the mock adapters (a real backend keeps this server-side). */
@Injectable({ providedIn: 'root' })
export class MockCartState {
  private readonly storage = inject(STORAGE);

  read(): StoredCart {
    try {
      const raw = this.storage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as StoredCart) : null;
      if (parsed && Array.isArray(parsed.items)) return parsed;
    } catch {
      // Corrupt data: start with an empty cart.
    }
    return { ...EMPTY_STORED_CART, items: [] };
  }

  write(cart: StoredCart): void {
    try {
      this.storage.setItem(KEY, JSON.stringify(cart));
    } catch {
      // Storage full or blocked; the in-memory response is still correct.
    }
  }

  /** Prices the stored cart against the catalog and saves the cleaned-up result. */
  async priced(): Promise<PricedCart> {
    const { products } = await loadCatalogData();
    const result = priceCart(this.read(), products, Date.now());
    this.write(result.stored);
    return result;
  }

  /**
   * Applies a change, then acknowledges current prices (so a price-change notice is shown once)
   * and returns the freshly priced cart.
   */
  async mutate(change: (stored: StoredCart, catalog: Awaited<ReturnType<typeof loadCatalogData>>) => StoredCart): Promise<PricedCart> {
    const catalog = await loadCatalogData();
    const next = change(this.read(), catalog);
    const acknowledged: StoredCart = {
      ...next,
      items: next.items.map((item) => {
        const variant = catalog.products.flatMap((p) => p.variants).find((v) => v.id === item.variantId);
        return variant ? { ...item, seenPrice: variant.price.amount } : item;
      }),
    };
    const result = priceCart(acknowledged, catalog.products, Date.now());
    this.write(result.stored);
    return result;
  }
}
