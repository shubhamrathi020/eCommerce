import { Injectable } from '@angular/core';
import { Observable, defer, delay, from, of, throwError } from 'rxjs';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { APP_CONFIG } from '@ecom/shared/core';
import type { HomeData, ListingQuery, Product, ProductSummary, Review, ReviewPage, ReviewQuery } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { CatalogApi, type ProductLookup } from '../lib/catalog.api';
import { computeServiceability, loadCatalogData as loadData } from './catalog-data';
import { bestDiscount, runListing, sortProducts, stockStatusOf, toSummary } from './catalog-engine';

let reviewsPromise: Promise<Review[]> | undefined;

function loadReviews() {
  reviewsPromise ??= import('./data/reviews.json').then((m) => m.default as Review[]);
  return reviewsPromise;
}

@Injectable()
export class MockCatalogApi extends CatalogApi {
  private readonly latency = inject(APP_CONFIG).mockLatencyMs ?? 200;
  private readonly ms = isPlatformBrowser(inject(PLATFORM_ID)) ? this.latency : 0;

  /** Runs `work` against the loaded data after simulated latency; thrown ApiExceptions become observable errors. */
  private run<T>(work: (data: Awaited<ReturnType<typeof loadData>>) => T | Promise<T>): Observable<T> {
    return defer(() =>
      from(loadData().then(work)).pipe(delay(this.ms)),
    );
  }

  home() {
    return this.run<HomeData>((d) => {
      const inStock = d.products.filter((p) => stockStatusOf(p).status !== 'out_of_stock');
      const summaries = (list: Product[], n: number) => list.slice(0, n).map(toSummary);
      const endOfDay = new Date();
      endOfDay.setUTCHours(23, 59, 59, 0);
      const deals = [...inStock].sort((a, b) => bestDiscount(b) - bestDiscount(a));
      return {
        banners: d.home.banners,
        categoryTiles: d.home.categoryTiles,
        deals: { endsAt: endOfDay.toISOString(), items: summaries(deals, 10) },
        rows: [
          { key: 'featured', title: 'Featured for you', items: summaries(sortProducts(inStock, 'featured'), 12) },
          { key: 'new', title: 'New arrivals', link: '/collections/trending', items: summaries(sortProducts(inStock, 'newest'), 12) },
          { key: 'best', title: 'Top rated', items: summaries(sortProducts(inStock.filter((p) => p.rating.count >= 5), 'rating'), 12) },
        ],
        brands: d.brands.slice(0, 12),
      };
    });
  }

  listing(query: ListingQuery) {
    return this.run((d) => runListing(d, query));
  }

  product(slug: string) {
    return this.run<ProductLookup>((d) => {
      const direct = d.products.find((p) => p.slug === slug);
      if (direct) return { product: direct };
      const moved = d.products.find((p) => p.slugHistory?.includes(slug));
      if (moved) return { product: moved, redirectedFrom: slug };
      throw new ApiException('not_found', 'Product not found');
    });
  }

  productsByIds(ids: string[]) {
    return this.run((d) => ids.map((id) => d.products.find((p) => p.id === id)).filter((p): p is Product => !!p));
  }

  summariesByIds(ids: string[]) {
    return this.run((d) => ids.map((id) => d.products.find((p) => p.id === id)).filter((p): p is Product => !!p).map(toSummary));
  }

  related(productId: string) {
    return this.run<ProductSummary[]>((d) => {
      const product = d.products.find((p) => p.id === productId);
      if (!product) return [];
      const sameLeaf = d.products.filter((p) => p.id !== productId && p.categoryId === product.categoryId);
      const sameRoot = d.products.filter((p) => p.id !== productId && p.categoryId !== product.categoryId && p.categoryPath[0].id === product.categoryPath[0].id);
      return sortProducts([...sameLeaf, ...sameRoot.slice(0, 4)], 'featured').slice(0, 8).map(toSummary);
    });
  }

  boughtTogether(productId: string) {
    return this.run<ProductSummary[]>((d) => {
      const product = d.products.find((p) => p.id === productId);
      if (!product) return [];
      // Deterministic pseudo co-purchase: popular in-stock items from other leaves under the same root.
      const others = d.products.filter((p) => p.categoryPath[0].id === product.categoryPath[0].id && p.categoryId !== product.categoryId && stockStatusOf(p).status !== 'out_of_stock');
      return sortProducts(others, 'featured').slice(0, 2).map(toSummary);
    });
  }

  reviews(productId: string, query: ReviewQuery) {
    return this.run<ReviewPage>(async (d) => {
      const product = d.products.find((p) => p.id === productId);
      if (!product) throw new ApiException('not_found', 'Product not found');
      const all = (await loadReviews()).filter((r) => r.productId === productId);
      const sorters: Record<ReviewQuery['sort'], (a: Review, b: Review) => number> = {
        recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
        helpful: (a, b) => b.helpful - a.helpful,
        high: (a, b) => b.rating - a.rating,
        low: (a, b) => a.rating - b.rating,
      };
      const sorted = [...all].sort(sorters[query.sort]);
      const start = (Math.max(1, query.page) - 1) * query.pageSize;
      return { items: sorted.slice(start, start + query.pageSize), total: sorted.length, summary: product.rating };
    });
  }

  serviceability(pincode: string) {
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return throwError(() => new ApiException('validation', 'Enter a valid 6-digit pin code', { pincode: 'Invalid pin code' }));
    }
    const result = computeServiceability(pincode);
    return of(result).pipe(delay(this.ms));
  }
}
