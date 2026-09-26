import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon';

/** Read-only star rating with an accessible text label. */
@Component({
  selector: 'ui-rating',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1', role: 'img', '[attr.aria-label]': 'label()' },
  template: `
    <span class="inline-flex text-accent" aria-hidden="true">
      @for (star of stars(); track $index) {
        <ui-icon name="star" [size]="size()" [filled]="star" [class.opacity-30]="!star" />
      }
    </span>
    @if (count() !== null) {
      <span class="text-sm text-text-muted" aria-hidden="true">({{ count() }})</span>
    }
  `,
})
export class RatingComponent {
  readonly value = input.required<number>();
  readonly count = input<number | null>(null);
  readonly size = input(16);

  protected readonly stars = computed(() => {
    const filled = Math.round(this.value());
    return [1, 2, 3, 4, 5].map((n) => n <= filled);
  });
  protected readonly label = computed(() => {
    const count = this.count();
    return `Rated ${this.value().toFixed(1)} out of 5${count === null ? '' : ` from ${count} reviews`}`;
  });
}
