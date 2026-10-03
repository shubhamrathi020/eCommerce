import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LocaleDatePipe, SeoService } from '@ecom/shared/core';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent } from '@ecom/shared/ui';

@Component({
  selector: 'app-account-home',
  imports: [LocaleDatePipe, RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.user(); as user) {
      <h1 class="mb-1 text-2xl font-bold md:text-3xl">Hello, {{ user.name }}</h1>
      <p class="mb-4 text-sm text-text-muted">{{ user.email }} · member since {{ user.createdAt | date: 'MMM y' }}</p>

      @if (!user.emailVerified) {
        <div class="mb-4 rounded-lg border border-warning p-4 text-sm" role="status">
          <p class="font-medium">Please verify your email address.</p>
          <p class="text-text-muted">We sent you a link when you registered.@if (dev) { <a routerLink="/dev/mailbox" class="ms-1 text-primary underline">Development only: open the demo mailbox</a> }</p>
        </div>
      }

      <ul class="grid gap-3 md:grid-cols-2">
        @for (tile of tiles; track tile.link) {
          <li>
            <a [routerLink]="tile.link" class="block rounded-lg border border-border p-4 hover:bg-surface-alt">
              <span class="block font-semibold">{{ tile.title }}</span>
              <span class="text-sm text-text-muted">{{ tile.text }}</span>
            </a>
          </li>
        }
      </ul>
      <button uiButton variant="secondary" type="button" class="mt-6" (click)="signOut()">Sign out</button>
    }
  `,
})
export class AccountHomeComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly dev = isDevMode();
  protected readonly tiles = [
    { title: 'Orders', text: 'Track, cancel and view invoices', link: '/orders' },
    { title: 'Returns and refunds', text: 'Request a return and follow your refund', link: '/account/returns' },
    { title: 'Help and support', text: 'Ask us about an order', link: '/account/support' },
    { title: 'Wishlist', text: 'Products you saved', link: '/wishlist' },
    { title: 'Addresses', text: 'Manage delivery addresses', link: '/account/addresses' },
    { title: 'Notifications', text: 'Order, review and price alerts', link: '/notifications' },
    { title: 'Notification preferences', text: 'Choose what we send you', link: '/account/preferences' },
    { title: 'Your alerts', text: 'Products you asked to be told about', link: '/account/alerts' },
    { title: 'Profile and password', text: 'Update your details', link: '/account/profile' },
    { title: 'Privacy', text: 'Export or delete your data', link: '/account/privacy' },
    { title: 'Personalisation', text: 'Control recommendations and activity tracking', link: '/personalisation' },
  ];

  constructor() {
    inject(SeoService).set({ title: 'My account', noindex: true, path: '/account' });
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
