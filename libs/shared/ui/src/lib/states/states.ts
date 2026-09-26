import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'ui-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block rounded-lg border border-dashed border-border-strong p-8 text-center' },
  template: `
    <h2 class="text-lg font-semibold text-text">{{ title() }}</h2>
    @if (description()) {
      <p class="mt-1 text-text-muted">{{ description() }}</p>
    }
    <div class="mt-4"><ng-content /></div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
}

@Component({
  selector: 'ui-error-state',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block rounded-lg border border-danger p-8 text-center', role: 'alert' },
  template: `
    <h2 class="text-lg font-semibold text-text">{{ title() }}</h2>
    <p class="mt-1 text-text-muted">{{ description() }}</p>
    <button uiButton variant="secondary" class="mt-4" type="button" (click)="retry.emit()">Try again</button>
  `,
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly description = input('We could not load this. Please try again.');
  readonly retry = output<void>();
}
