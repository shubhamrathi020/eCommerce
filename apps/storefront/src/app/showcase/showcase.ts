import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ToastService } from '@ecom/shared/core';
import {
  BadgeComponent,
  BreadcrumbComponent,
  ButtonComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  FormFieldComponent,
  IconComponent,
  InputDirective,
  PriceComponent,
  QuantityStepperComponent,
  RatingComponent,
  SkeletonComponent,
  SpinnerComponent,
  type IconName,
} from '@ecom/shared/ui';

/** Dev-only catalogue of shared UI components and their states (`/__ui`). */
@Component({
  selector: 'app-showcase',
  imports: [
    BadgeComponent,
    BreadcrumbComponent,
    ButtonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FormFieldComponent,
    IconComponent,
    InputDirective,
    PriceComponent,
    QuantityStepperComponent,
    RatingComponent,
    SkeletonComponent,
    SpinnerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-6 text-3xl font-bold">UI showcase</h1>

    <section class="mb-10" aria-labelledby="s-buttons">
      <h2 id="s-buttons" class="mb-3 text-xl font-semibold">Buttons</h2>
      <div class="flex flex-wrap items-center gap-3">
        <button uiButton>Primary</button>
        <button uiButton variant="secondary">Secondary</button>
        <button uiButton variant="ghost">Ghost</button>
        <button uiButton variant="danger">Danger</button>
        <button uiButton size="sm">Small</button>
        <button uiButton size="lg">Large</button>
        <button uiButton [loading]="true">Loading</button>
        <button uiButton disabled>Disabled</button>
      </div>
    </section>

    <section class="mb-10" aria-labelledby="s-forms">
      <h2 id="s-forms" class="mb-3 text-xl font-semibold">Form fields</h2>
      <div class="grid max-w-xl gap-4">
        <ui-form-field #a="uiFormField" label="Name" hint="As on your ID" [required]="true">
          <input uiInput [id]="a.id" [attr.aria-describedby]="a.describedBy()" placeholder="Jane Doe" />
        </ui-form-field>
        <ui-form-field #b="uiFormField" label="Email" error="Enter a valid email address">
          <input uiInput [id]="b.id" [attr.aria-describedby]="b.describedBy()" aria-invalid="true" value="nope" />
        </ui-form-field>
        <ui-form-field #c="uiFormField" label="Disabled">
          <input uiInput [id]="c.id" disabled value="Cannot edit" />
        </ui-form-field>
      </div>
    </section>

    <section class="mb-10" aria-labelledby="s-display">
      <h2 id="s-display" class="mb-3 text-xl font-semibold">Badges, rating, price, icons</h2>
      <div class="flex flex-wrap items-center gap-3">
        <ui-badge>Neutral</ui-badge>
        <ui-badge tone="primary">New</ui-badge>
        <ui-badge tone="success">In stock</ui-badge>
        <ui-badge tone="warning">Only 3 left</ui-badge>
        <ui-badge tone="danger">Out of stock</ui-badge>
        <ui-badge tone="sale">25% off</ui-badge>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-6">
        <ui-rating [value]="4.3" [count]="128" />
        <ui-price [price]="{ amount: 74900, currency: 'INR' }" [mrp]="{ amount: 99900, currency: 'INR' }" />
        <ui-price [price]="{ amount: 129950, currency: 'INR' }" />
      </div>
      <div class="mt-4 flex flex-wrap gap-4">
        @for (icon of icons; track icon) {
          <ui-icon [name]="icon" [size]="24" [label]="icon" />
        }
      </div>
    </section>

    <section class="mb-10" aria-labelledby="s-misc">
      <h2 id="s-misc" class="mb-3 text-xl font-semibold">Stepper, breadcrumb, loading</h2>
      <div class="flex flex-wrap items-center gap-6">
        <ui-quantity-stepper [(value)]="qty" [max]="5" />
        <ui-breadcrumb [items]="[{ label: 'Home', link: '/' }, { label: 'Fashion', link: '/c/fashion' }, { label: 'Shirts' }]" />
        <ui-spinner />
      </div>
      <div class="mt-4 grid max-w-md gap-2">
        <ui-skeleton class="h-40 w-full" />
        <ui-skeleton class="h-4 w-3/4" />
      </div>
    </section>

    <section class="mb-10" aria-labelledby="s-states">
      <h2 id="s-states" class="mb-3 text-xl font-semibold">States and toasts</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <ui-empty-state title="No results" description="Try different filters."><button uiButton variant="secondary">Clear filters</button></ui-empty-state>
        <ui-error-state />
      </div>
      <div class="mt-4 flex gap-3">
        <button uiButton variant="secondary" (click)="toast.success('Saved successfully')">Success toast</button>
        <button uiButton variant="secondary" (click)="toast.error('Could not save')">Error toast</button>
        <button uiButton variant="secondary" (click)="toast.info('Heads up')">Info toast</button>
      </div>
    </section>
  `,
})
export class ShowcaseComponent {
  protected readonly toast = inject(ToastService);
  protected readonly qty = signal(1);
  protected readonly icons: IconName[] = ['search', 'cart', 'heart', 'user', 'menu', 'x', 'chevron-down', 'chevron-right', 'check', 'alert', 'info', 'star'];
}
