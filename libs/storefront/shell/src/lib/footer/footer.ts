import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { APP_CONFIG, ToastService } from '@ecom/shared/core';
import { ContentApi, NewsletterApi } from '@ecom/shared/data-access';
import { rxResource } from '@angular/core/rxjs-interop';
import type { LinkGroup, NavLink } from '@ecom/shared/models';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, ReactiveFormsModule, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mt-12 block print:hidden border-t border-border bg-surface-alt' },
  template: `
    <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
      @for (group of groups; track group.key) {
        <section [attr.aria-labelledby]="'f-' + group.key">
          <h2 [id]="'f-' + group.key" class="mb-3 font-semibold">{{ group.key === 'about' ? siteName : group.title }}</h2>
          <ul class="space-y-2 text-sm text-text-muted">
            @for (link of linksFor(group.key); track link.id) {
              <li>
                @if (link.href.startsWith('/')) {
                  <a [routerLink]="link.href" class="hover:text-primary hover:underline">{{ link.label }}</a>
                } @else {
                  <a [href]="link.href" rel="noopener noreferrer" class="hover:text-primary hover:underline">{{ link.label }}</a>
                }
              </li>
            }
          </ul>
        </section>
      }
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
  private readonly content = inject(ContentApi);
  private readonly nav = rxResource({ stream: () => this.content.navigation() });
  private readonly links = computed<NavLink[]>(() => (this.nav.hasValue() ? this.nav.value() : []));
  protected readonly groups: { key: LinkGroup; title: string }[] = [
    { key: 'about', title: '' },
    { key: 'help', title: 'Help' },
    { key: 'legal', title: 'Legal' },
  ];

  protected linksFor(group: LinkGroup): NavLink[] {
    return this.links().filter((l) => l.group === group);
  }

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
