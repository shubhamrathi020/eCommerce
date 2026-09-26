import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';
import { IconComponent } from '../icon/icon';

/** Horizontally scrolling row with scroll-snap and previous/next buttons (for product rows). */
@Component({
  selector: 'ui-scroller',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  template: `
    <div #track class="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:thin]" role="list" [attr.aria-label]="label()">
      <ng-content />
    </div>
    <button type="button" class="absolute -left-3 top-1/3 hidden size-11 items-center justify-center rounded-full border border-border bg-surface shadow-card hover:bg-surface-alt md:inline-flex" aria-label="Scroll left" (click)="scroll(-1)">
      <ui-icon name="chevron-right" class="rotate-180" />
    </button>
    <button type="button" class="absolute -right-3 top-1/3 hidden size-11 items-center justify-center rounded-full border border-border bg-surface shadow-card hover:bg-surface-alt md:inline-flex" aria-label="Scroll right" (click)="scroll(1)">
      <ui-icon name="chevron-right" />
    </button>
  `,
})
export class ScrollerComponent {
  readonly label = input('Products');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected scroll(direction: 1 | -1): void {
    const el = this.track().nativeElement;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }
}
