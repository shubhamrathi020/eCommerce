import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Pulsing placeholder. Size it from the parent with utility classes so it matches the final layout. */
@Component({
  selector: 'ui-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block animate-pulse rounded-md bg-surface-alt', 'aria-hidden': 'true' },
  template: ``,
})
export class SkeletonComponent {}

@Component({
  selector: 'ui-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent', role: 'status', 'aria-label': 'Loading' },
  template: ``,
})
export class SpinnerComponent {}
