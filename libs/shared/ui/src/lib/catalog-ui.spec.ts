import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ProductSummary } from '@ecom/shared/models';
import { pageItems } from './pagination/pagination';
import { ProductCardComponent } from './product-card/product-card';

const product: ProductSummary = {
  id: 'p1',
  slug: 'blue-shirt',
  title: 'Blue Shirt',
  brandName: 'Northline',
  categoryName: 'Men Clothing',
  image: { url: '/mock/img/a.svg', alt: 'Blue Shirt - view 1', width: 800, height: 800 },
  hoverImage: { url: '/mock/img/b.svg', alt: 'x', width: 800, height: 800 },
  priceMin: { amount: 79900, currency: 'INR' },
  priceMax: { amount: 89900, currency: 'INR' },
  mrpMin: { amount: 99900, currency: 'INR' },
  rating: { average: 4.2, count: 12 },
  stockStatus: 'low_stock',
  stockLeft: 3,
  variantCount: 1,
  quickAddVariantId: 'p1-v1',
};

@Component({
  imports: [ProductCardComponent],
  template: `<ui-product-card [product]="product()" [wishlisted]="wish()" (quickAdd)="added.set(true)" (wishlistToggle)="wish.set(!wish())" />`,
})
class HostComponent {
  product = signal(product);
  wish = signal(false);
  added = signal(false);
}

describe('pageItems', () => {
  it('shows every page when there are few', () => {
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('collapses long ranges with gaps around the current page', () => {
    expect(pageItems(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(pageItems(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
    expect(pageItems(20, 20)).toEqual([1, 'gap', 19, 20]);
  });
});

describe('ProductCardComponent', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('shows discount, low stock, from-price and links the title to the product page', async () => {
    const { el } = await setup();
    const text = el.textContent ?? '';
    expect(text).toContain('20% off');
    expect(text).toContain('Only 3 left');
    expect(text).toContain('From');
    expect(text).toContain('₹799');
    expect(el.querySelector('h3 a')?.getAttribute('href')).toBe('/p/blue-shirt');
  });

  it('wishlist button reflects and toggles state with an accessible name', async () => {
    const { fixture, el } = await setup();
    const button = el.querySelector('button[aria-pressed]') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Add Blue Shirt to wishlist');
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Remove Blue Shirt from wishlist');
  });

  it('offers quick add only for single-variant products', async () => {
    const { fixture, el } = await setup();
    const quick = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Add to cart'));
    expect(quick).toBeDefined();
    quick?.click();
    expect(fixture.componentInstance.added()).toBe(true);
    fixture.componentInstance.product.set({ ...product, quickAddVariantId: undefined });
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Add to cart'))).toBe(false);
  });
});
