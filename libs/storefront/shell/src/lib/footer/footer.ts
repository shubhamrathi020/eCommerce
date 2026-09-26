import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { APP_CONFIG, ToastService } from '@ecom/shared/core';
import { NewsletterApi } from '@ecom/shared/data-access';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, ReactiveFormsModule, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mt-12 block print:hidden border-t border-border bg-surface-alt' },
  template: `
    <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
      <section aria-labelledby="f-about">
        <h2 id="f-about" class="mb-3 font-semibold">{{ siteName }}</h2>
        <ul class="space-y-2 text-sm text-text-muted">
          <li><a routerLink="/pages/about" class="hover:text-primary hover:underline">About us</a></li>
          <li><a routerLink="/pages/contact" class="hover:text-primary hover:underline">Contact us</a></li>
        </ul>
      </section>
      <section aria-labelledby="f-help">
        <h2 id="f-help" class="mb-3 font-semibold">Help</h2>
        <ul class="space-y-2 text-sm text-text-muted">
          <li><a routerLink="/pages/faq" class="hover:text-primary hover:underline">FAQ</a></li>
          <li><a routerLink="/orders" class="hover:text-primary hover:underline">Track order</a></li>
        </ul>
      </section>
      <section aria-labelledby="f-legal">
        <h2 id="f-legal" class="mb-3 font-semibold">Legal</h2>
        <ul class="space-y-2 text-sm text-text-muted">
          <li><a routerLink="/pages/terms" class="hover:text-primary hover:underline">Terms and conditions</a></li>
          <li><a routerLink="/pages/privacy" class="hover:text-primary hover:underline">Privacy policy</a></li>
        </ul>
      </section>
      <section aria-labelledby="f-news">
        <h2 id="f-news" class="mb-3 font-semibold">Newsletter</h2>
        <form (submit)="subscribe($event)" novalidate class="space-y-2">
          <ui-form-field #field="uiFormField" label="Email address" [error]="error()">
            <input uiInput type="email" autocomplete="email" inputmode="email" [id]="field.id" [attr.aria-describedby]="field.describedBy()" [attr.aria-invalid]="error() ? 'true' : null" [formControl]="email" />
          </ui-form-field>
          <button uiButton type="submit" [loading]="busy()">Subscribe</button>
        </form>
      </section>
    </div>
    <div class="border-t border-border py-4 text-center text-sm text-text-muted">
      © {{ year }} {{ siteName }}. Payments by UPI, cards, net banking, wallets and cash on delivery.
    </div>
  `,
})
export class FooterComponent {
  private readonly api = inject(NewsletterApi);
  private readonly toast = inject(ToastService);

  protected readonly siteName = inject(APP_CONFIG).siteName;
  protected readonly year = new Date().getFullYear();
  protected readonly email = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected subscribe(event: Event): void {
    event.preventDefault();
    this.error.set('');
    if (this.email.invalid) {
      this.error.set(this.email.value ? 'Enter a valid email address' : 'Email address is required');
      return;
    }
    this.busy.set(true);
    this.api.subscribe(this.email.value).subscribe({
      next: () => {
        this.busy.set(false);
        this.email.reset();
        this.toast.success('Thanks for subscribing!');
      },
      error: (e: { message?: string }) => {
        this.busy.set(false);
        this.error.set(e.message ?? 'Could not subscribe. Please try again.');
      },
    });
  }
}
