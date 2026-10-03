import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input } from '@angular/core';
import { AppReadyService } from '@ecom/shared/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-contrast hover:bg-primary-hover',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-alt',
  ghost: 'text-text hover:bg-surface-alt',
  danger: 'bg-danger text-on-status hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-12 px-6 text-lg',
};

/** Use as `<button uiButton>` or `<a uiButton>`. Min height keeps touch targets at 44px (md, lg). */
// Attribute-style component on native elements keeps button/link semantics.
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[uiButton], a[uiButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.aria-disabled]': 'loading() ? "true" : null',
    '[attr.disabled]': 'blockedBeforeHydration() ? "" : null',
    '(click)': 'blockWhileLoading($event)',
  },
  template: `
    @if (loading()) {
      <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
    }
    <ng-content />
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly loading = input(false);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly appReady = inject(AppReadyService);
  /**
   * Only a `<button>` whose type resolves to `submit` (the browser's own default inside a `<form>`,
   * even with no `type` attribute) can trigger a native page reload before the app has hydrated. Other
   * buttons already do nothing until their `(click)` binding attaches, so leaving them enabled changes
   * nothing about safety and keeps this from disabling the whole page during every hydration.
   */
  private readonly isSubmit = this.host.tagName === 'BUTTON' && (this.host as HTMLButtonElement).type === 'submit';
  protected readonly blockedBeforeHydration = computed(() => this.isSubmit && !this.appReady.ready());

  /** Loading keeps the button focusable (no `disabled`) but ignores clicks. */
  protected blockWhileLoading(event: Event): void {
    if (this.loading()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.variant()]} ${SIZES[this.size()]}`);
}
