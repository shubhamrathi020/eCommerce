import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon';

/**
 * Slide-in panel with backdrop. Traps focus while open and restores it on close; Esc closes.
 * Use `[(open)]` for two-way binding.
 */
@Component({
  selector: 'ui-drawer',
  imports: [A11yModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-30 bg-black/50" aria-hidden="true" (click)="close()"></div>
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="label()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        class="fixed inset-y-0 z-30 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-modal"
        [class]="side() === 'left' ? 'start-0' : 'end-0'"
      >
        <div class="flex items-center justify-between border-b border-border p-4">
          <h2 class="text-lg font-semibold">{{ label() }}</h2>
          <button type="button" class="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-alt" aria-label="Close" (click)="close()">
            <ui-icon name="x" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4"><ng-content /></div>
      </div>
    }
  `,
})
export class DrawerComponent {
  readonly open = model(false);
  readonly label = input.required<string>();
  readonly side = input<'left' | 'right'>('left');

  protected close(): void {
    this.open.set(false);
  }
}
