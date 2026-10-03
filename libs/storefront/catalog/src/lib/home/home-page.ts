import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { CatalogApi, ContentApi } from '@ecom/shared/data-access';
import type { ProductRow, ProductSummary } from '@ecom/shared/models';
import { CountdownComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';
import { ProductRowComponent } from '../product-row/product-row';
import { RecentlyViewedComponent } from '../recently-viewed/recently-viewed';
import { DealsStripComponent } from '../deals/deal-banner';
import { HomeRecosComponent } from '../recommendations/reco-row';
import { HeroCarouselComponent } from './hero-carousel';

@Component({
  selector: 'app-home-page',
  imports: [NgOptimizedImage, RouterLink, DealsStripComponent, HomeRecosComponent, CountdownComponent, ErrorStateComponent, SkeletonComponent, HeroCarouselComponent, ProductRowComponent, RecentlyViewedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">Shop: fashion, electronics, groceries and more</h1>
    @switch (home.status()) {
      @case ('loading') {
        <ui-skeleton class="aspect-[16/9] w-full md:aspect-[1600/560]" />
        <div class="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          @for (n of [1, 2, 3, 4]; track n) {
            <ui-skeleton class="h-32" />
          }
        </div>
      }
      @case ('error') {
        <ui-error-state (retry)="home.reload()" />
      }
      @default {
        @if (home.hasValue()) {
          @let data = home.value();
          <div class="space-y-10">
            @if (config.hasValue() && config.value().banners.length) {
              <app-hero-carousel [banners]="config.value().banners" />
            }

            <app-deals-strip />

            @defer (on idle) {
              <app-home-recos />
            }

            @for (section of sections(); track section.key) {
              @switch (section.key) {
                @case ('categories') {
                  <section aria-label="Shop by category">
                    <h2 class="mb-3 text-xl font-semibold md:text-2xl">{{ section.title }}</h2>
                    <ul class="grid grid-cols-2 gap-3 md:grid-cols-4">
                      @for (tile of data.categoryTiles; track tile.slug) {
                        <li>
                          <a [routerLink]="['/c', tile.slug]" class="group relative block overflow-hidden rounded-lg">
                            <img [ngSrc]="tile.image.url" [width]="tile.image.width" [height]="tile.image.height" [alt]="''" class="aspect-[3/2] w-full object-cover transition-transform duration-250 group-hover:scale-105" />
                            <span class="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 font-semibold text-white">{{ tile.name }}</span>
                          </a>
                        </li>
                      }
                    </ul>
                  </section>
                }
                @case ('deals') {
                  @if (data.deals.items.length) {
                    <section [attr.aria-label]="section.title" class="rounded-lg bg-surface-alt p-4 md:p-6">
                      <p class="mb-3 text-sm">
                        <span class="text-lg font-semibold md:text-2xl">{{ section.title }}</span>
                        <span class="ms-3 text-text-muted">Ends in <ui-countdown [endsAt]="data.deals.endsAt" /></span>
                      </p>
                      <app-product-row title="Deals on top picks" [items]="data.deals.items" />
                    </section>
                  }
                }
                @case ('featured') {
                  <app-product-row [title]="section.title" [items]="rowItems(data.rows, 'featured')" />
                }
                @case ('new') {
                  <app-product-row [title]="section.title" [items]="rowItems(data.rows, 'new')" [link]="'/collections/trending'" />
                }
                @case ('best') {
                  <app-product-row [title]="section.title" [items]="rowItems(data.rows, 'best')" />
                }
                @case ('brands') {
                  <section aria-label="Popular brands">
                    <h2 class="mb-3 text-xl font-semibold md:text-2xl">{{ section.title }}</h2>
                    <ul class="flex flex-wrap gap-2">
                      @for (brand of data.brands; track brand.id) {
                        <li>
                          <a [routerLink]="['/b', brand.slug]" class="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-sm font-medium hover:bg-surface-alt">{{ brand.name }}</a>
                        </li>
                      }
                    </ul>
                  </section>
                }
                @case ('recent') {
                  <app-recently-viewed />
                }
              }
            }
          </div>
        }
      }
    }
  `,
})
export class HomePageComponent {
  private readonly api = inject(CatalogApi);
  private readonly contentApi = inject(ContentApi);
  protected readonly home = rxResource({ stream: () => this.api.home() });
  /** Banners and section order come from the content service, so staff can change them without a release. */
  protected readonly config = rxResource({ stream: () => this.contentApi.homeConfig() });
  protected readonly sections = computed(() => (this.config.hasValue() ? this.config.value().sections : []));

  protected rowItems(rows: ProductRow[], key: string): ProductSummary[] {
    return rows.find((r) => r.key === key)?.items ?? [];
  }

  constructor() {
    inject(SeoService).set({ title: 'Fashion, electronics, groceries and more', description: 'Shop fashion, electronics, groceries, home, beauty and more with fast delivery and easy returns.', path: '/' });
  }
}
