import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'sale';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-alt text-text border border-border',
  primary: 'bg-primary text-primary-contrast',
  success: 'bg-success text-on-status',
  warning: 'bg-warning text-on-status',
  danger: 'bg-danger text-on-status',
  sale: 'bg-sale text-on-status',
};

@Component({
  selector: 'ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: `<ng-content />`,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  protected readonly classes = computed(
    () => `inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[this.tone()]}`,
  );
}
