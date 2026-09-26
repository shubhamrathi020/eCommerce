import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@ecom/shared/core';
import { IconComponent } from '../icon/icon';

/** Place once in the app shell. Polite live region so screen readers announce new toasts. */
@Component({
  selector: 'ui-toast-container',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'print:hidden pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4',
    'aria-live': 'polite',
  },
  template: `
    @for (toast of toasts(); track toast.id) {
      <div
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border bg-surface p-3 shadow-popover"
        [class]="{
          'border-success': toast.kind === 'success',
          'border-danger': toast.kind === 'error',
          'border-info': toast.kind === 'info',
        }"
        [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
      >
        <ui-icon
          [name]="toast.kind === 'success' ? 'check' : toast.kind === 'error' ? 'alert' : 'info'"
          [class]="{
            'text-success': toast.kind === 'success',
            'text-danger': toast.kind === 'error',
            'text-info': toast.kind === 'info',
          }"
        />
        <p class="flex-1 text-sm text-text">{{ toast.message }}</p>
        <button type="button" class="rounded p-1 text-text-muted hover:bg-surface-alt" aria-label="Dismiss" (click)="dismiss(toast.id)">
          <ui-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `,
})
export class ToastContainerComponent {
  private readonly service = inject(ToastService);
  protected readonly toasts = this.service.toasts;

  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
