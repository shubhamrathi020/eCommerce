import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'ui-quantity-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center rounded-md border border-border-strong', role: 'group', '[attr.aria-label]': 'label()' },
  template: `
    <button type="button" class="inline-flex size-11 items-center justify-center rounded-l-md hover:bg-surface-alt disabled:opacity-40" aria-label="Decrease quantity" [disabled]="value() <= min()" (click)="step(-1)">
      <span aria-hidden="true" class="text-xl leading-none">−</span>
    </button>
    <output class="min-w-10 text-center font-medium" aria-live="polite">{{ value() }}</output>
    <button type="button" class="inline-flex size-11 items-center justify-center rounded-r-md hover:bg-surface-alt disabled:opacity-40" aria-label="Increase quantity" [disabled]="value() >= max()" (click)="step(1)">
      <span aria-hidden="true" class="text-xl leading-none">+</span>
    </button>
  `,
})
export class QuantityStepperComponent {
  readonly value = model(1);
  readonly min = input(1);
  readonly max = input(10);
  readonly label = input('Quantity');

  protected step(delta: number): void {
    this.value.update((v) => Math.min(this.max(), Math.max(this.min(), v + delta)));
  }
}
