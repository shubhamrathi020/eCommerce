import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Step indicator for multi-step flows. Steps before `current` are complete. */
@Component({
  selector: 'ui-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ol class="flex items-center gap-2 text-sm" [attr.aria-label]="label()">
      @for (step of steps(); track step; let i = $index) {
        <li class="flex items-center gap-2" [attr.aria-current]="i === current() ? 'step' : null">
          <span
            class="inline-flex size-7 items-center justify-center rounded-full border text-xs font-semibold"
            [class]="i < current() ? 'border-success bg-success text-white' : i === current() ? 'border-primary bg-primary text-primary-contrast' : 'border-border-strong text-text-muted'"
            aria-hidden="true"
            >{{ i < current() ? '✓' : i + 1 }}</span
          >
          <span [class]="i === current() ? 'font-semibold' : 'text-text-muted'" [class.hidden]="i !== current()" [class.md:inline]="true">{{ step }}</span>
          @if (i < steps().length - 1) {
            <span class="h-px w-4 bg-border-strong md:w-8" aria-hidden="true"></span>
          }
        </li>
      }
    </ol>
  `,
})
export class StepperComponent {
  readonly steps = input.required<string[]>();
  /** Zero-based index of the current step. */
  readonly current = input.required<number>();
  readonly label = input('Checkout progress');
}
