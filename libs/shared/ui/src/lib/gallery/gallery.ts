import { A11yModule } from '@angular/cdk/a11y';
import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, model, signal } from '@angular/core';
import type { ImageRef } from '@ecom/shared/models';
import { IconComponent } from '../icon/icon';

/** Product gallery: thumbnails, hover zoom on desktop, and a keyboard-friendly lightbox. */
@Component({
  selector: 'ui-gallery',
  imports: [NgOptimizedImage, A11yModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="flex flex-col gap-3 md:flex-row-reverse">
      <div class="relative flex-1">
        <button
          type="button"
          class="group relative block aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-alt"
          aria-label="Open larger image"
          (click)="lightbox.set(true)"
          (mousemove)="onMove($event)"
          (mouseleave)="zoom.set(null)"
        >
          <img
            [ngSrc]="current().url"
            [width]="current().width"
            [height]="current().height"
            [alt]="current().alt"
            priority
            class="size-full object-cover transition-transform duration-150"
            [style.transform]="zoom() ? 'scale(2)' : 'none'"
            [style.transform-origin]="zoom() ? zoom()!.x + '% ' + zoom()!.y + '%' : null"
          />
        </button>
        @if (images().length > 1) {
          <p class="mt-1 text-center text-xs text-text-muted" aria-live="polite">Image {{ index() + 1 }} of {{ images().length }}</p>
        }
      </div>
      @if (images().length > 1) {
        <ul class="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Product images">
          @for (img of images(); track img.url; let i = $index) {
            <li class="shrink-0">
              <button
                type="button"
                class="block size-16 overflow-hidden rounded-md border-2 md:size-20"
                [class]="i === index() ? 'border-primary' : 'border-border'"
                [attr.aria-label]="'Show image ' + (i + 1)"
                [attr.aria-current]="i === index() ? 'true' : null"
                (click)="index.set(i)"
              >
                <img [ngSrc]="img.url" [width]="80" [height]="80" alt="" class="size-full object-cover" />
              </button>
            </li>
          }
        </ul>
      }
    </div>

    @if (lightbox()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Image viewer" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
        <div class="absolute inset-0" aria-hidden="true" (click)="lightbox.set(false)"></div>
        <img [src]="current().url" [alt]="current().alt" class="relative max-h-full max-w-full rounded-md bg-white object-contain" />
        <button type="button" class="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-surface" aria-label="Close image viewer" (click)="lightbox.set(false)"><ui-icon name="x" /></button>
        @if (images().length > 1) {
          <button type="button" class="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface" aria-label="Previous image" (click)="step(-1)"><ui-icon name="chevron-right" class="rotate-180" /></button>
          <button type="button" class="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface" aria-label="Next image" (click)="step(1)"><ui-icon name="chevron-right" /></button>
        }
      </div>
    }
  `,
})
export class GalleryComponent {
  readonly images = input.required<ImageRef[]>();
  /** Selected image index; two-way bindable so a chosen variant can switch the picture. */
  readonly index = model(0);

  protected readonly lightbox = signal(false);
  protected readonly zoom = signal<{ x: number; y: number } | null>(null);
  protected readonly current = computed(() => this.images()[Math.min(this.index(), this.images().length - 1)]);

  constructor() {
    // A new image set (e.g. navigating between products) starts at the first image.
    effect(() => {
      this.images();
      this.index.set(0);
    });
  }

  protected onMove(event: MouseEvent): void {
    if (window.matchMedia?.('(hover: none)').matches) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.zoom.set({ x: ((event.clientX - box.left) / box.width) * 100, y: ((event.clientY - box.top) / box.height) * 100 });
  }

  protected step(delta: number): void {
    const n = this.images().length;
    this.index.set((this.index() + delta + n) % n);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.lightbox()) return;
    if (event.key === 'Escape') this.lightbox.set(false);
    else if (event.key === 'ArrowRight') this.step(1);
    else if (event.key === 'ArrowLeft') this.step(-1);
  }
}
