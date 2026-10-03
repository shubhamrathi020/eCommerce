import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { I18nService, TranslatePipe } from '@ecom/shared/core';

@Component({
  selector: 'ui-quantity-stepper',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center rounded-md border border-border-strong', role: 'group', '[attr.aria-label]': 'name()' },
  template: `
    <button type="button" class="inline-flex size-11 items-center justify-center rounded-s-md hover:bg-surface-alt disabled:opacity-40" [attr.aria-label]="'qty.decrease' | t" [disabled]="value() <= min()" (click)="step(-1)">
      <span aria-hidden="true" class="text-xl leading-none">−</span>
    </button>
    <output class="min-w-10 text-center font-medium" aria-live="polite">{{ value() }}</output>
    <button type="button" class="inline-flex size-11 items-center justify-center rounded-e-md hover:bg-surface-alt disabled:opacity-40" [attr.aria-label]="'qty.increase' | t" [disabled]="value() >= max()" (click)="step(1)">
      <span aria-hidden="true" class="text-xl leading-none">+</span>
    </button>
  `,
})
export class QuantityStepperComponent {
  readonly value = model(1);
  readonly min = input(1);
  readonly max = input(10);
  /** Accessible name; defaults to the translated word for quantity. */
  readonly label = input<string | undefined>();
  private readonly i18n = inject(I18nService);
  protected readonly name = computed(() => this.label() ?? this.i18n.t('qty.label'));

  protected step(delta: number): void {
    this.value.update((v) => Math.min(this.max(), Math.max(this.min(), v + delta)));
  }
}
