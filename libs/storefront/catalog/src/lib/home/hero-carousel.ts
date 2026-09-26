import { NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Banner } from '@ecom/shared/models';
import { IconComponent } from '@ecom/shared/ui';

/** Autoplaying banner carousel. Pauses on hover/focus and never autoplays with reduced motion. */
@Component({
  selector: 'app-hero-carousel',
  imports: [NgOptimizedImage, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="relative overflow-hidden rounded-lg bg-surface-alt"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      (mouseenter)="paused.set(true)"
      (mouseleave)="paused.set(false)"
      (focusin)="paused.set(true)"
      (focusout)="paused.set(false)"
    >
      @for (banner of banners(); track banner.id; let i = $index) {
        @if (i === index()) {
          <div class="relative" role="group" aria-roledescription="slide" [attr.aria-label]="i + 1 + ' of ' + banners().length">
            <img [ngSrc]="banner.image.url" [width]="banner.image.width" [height]="banner.image.height" [alt]="banner.image.alt" [priority]="i === 0" class="aspect-[16/9] w-full object-cover md:aspect-[1600/560]" />
            <div class="absolute inset-0 flex flex-col justify-center gap-2 p-5 text-white md:gap-3 md:p-12">
              <h2 class="max-w-md text-2xl font-bold drop-shadow md:text-4xl">{{ banner.title }}</h2>
              <p class="max-w-md text-sm drop-shadow md:text-lg">{{ banner.subtitle }}</p>
              <a [routerLink]="banner.link" class="mt-1 inline-flex min-h-11 w-fit items-center rounded-md bg-white px-5 font-semibold text-primary hover:bg-surface-alt">{{ banner.cta }}</a>
            </div>
          </div>
        }
      }
      @if (banners().length > 1) {
        <button type="button" class="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-card hover:bg-surface" aria-label="Previous slide" (click)="step(-1)"><ui-icon name="chevron-right" class="rotate-180" /></button>
        <button type="button" class="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-card hover:bg-surface" aria-label="Next slide" (click)="step(1)"><ui-icon name="chevron-right" /></button>
        <div class="absolute inset-x-0 bottom-2 flex justify-center gap-1">
          @for (banner of banners(); track banner.id; let i = $index) {
            <button type="button" class="inline-flex size-6 items-center justify-center" [attr.aria-label]="'Go to slide ' + (i + 1)" [attr.aria-current]="i === index() ? 'true' : null" (click)="index.set(i)">
              <span class="size-2.5 rounded-full" [class]="i === index() ? 'bg-white' : 'bg-white/50'"></span>
            </button>
          }
        </div>
      }
    </section>
  `,
})
export class HeroCarouselComponent {
  readonly banners = input.required<Banner[]>();
  protected readonly index = signal(0);
  protected readonly paused = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    effect((onCleanup) => {
      if (reduced || this.paused() || this.banners().length < 2) return;
      const id = setInterval(() => this.step(1), 6000);
      onCleanup(() => clearInterval(id));
    });
  }

  protected step(delta: number): void {
    const n = this.banners().length;
    this.index.set((this.index() + delta + n) % n);
  }
}
