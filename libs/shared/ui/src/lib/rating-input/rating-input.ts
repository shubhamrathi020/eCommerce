import { ChangeDetectionStrategy, Component, ElementRef, inject, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon';

/** Star picker (1 to 5) built as a radio group: arrow keys move and select, with a text alternative for each star. */
@Component({
  selector: 'ui-rating-input',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', role: 'radiogroup', '[attr.aria-label]': 'label()', '[attr.aria-invalid]': 'invalid() ? "true" : null' },
  template: `
    @for (n of stars; track n) {
      <button
        type="button"
        role="radio"
        class="inline-flex size-11 items-center justify-center rounded-md text-accent hover:bg-surface-alt"
        [attr.aria-checked]="value() === n"
        [attr.aria-label]="n + (n === 1 ? ' star' : ' stars')"
        [tabindex]="focusable(n) ? 0 : -1"
        (click)="value.set(n)"
        (keydown)="onKeydown($event, n)"
      >
        <ui-icon name="star" [size]="26" [filled]="n <= value()" [class.opacity-40]="n > value()" />
      </button>
    }
  `,
})
export class RatingInputComponent {
  readonly value = model(0);
  readonly label = input('Rating');
  readonly invalid = input(false);
  protected readonly stars = [1, 2, 3, 4, 5];
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Roving tabindex: the selected star, or the first when none is chosen. */
  protected focusable(n: number): boolean {
    return this.value() === n || (this.value() === 0 && n === 1);
  }

  protected onKeydown(event: KeyboardEvent, current: number): void {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = Math.min(5, Math.max(1, current + step));
    this.value.set(next);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]')[next - 1]?.focus();
  }
}
