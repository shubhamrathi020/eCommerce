import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, ToastContainerComponent } from '@ecom/shared/ui';

const NAV = [
  { label: 'Overview', link: '/', exact: true, portal: false },
  { label: 'Products', link: '/products', exact: false, portal: true },
  { label: 'Orders', link: '/orders', exact: false, portal: true },
  { label: 'Payouts', link: '/payouts', exact: false, portal: true },
];

/** The seller portal frame. Working pages are listed only for accounts that have been approved to sell. */
@Component({
  selector: 'sel-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonComponent, ToastContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#seller-main" class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-contrast focus:not-sr-only focus:fixed focus:left-2 focus:top-2">Skip to main content</a>
    <div class="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Seller portal" class="border-b border-border bg-surface-alt p-3 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:p-4">
        <p class="mb-2 text-lg font-bold text-primary md:mb-4">Seller Centre</p>
        <ul class="flex flex-wrap gap-1 md:flex-col">
          @for (item of items(); track item.link) {
            <li>
              <a [routerLink]="item.link" routerLinkActive="bg-primary text-primary-contrast" [routerLinkActiveOptions]="{ exact: item.exact }" class="flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-border">{{ item.label }}</a>
            </li>
          }
        </ul>
        <div class="mt-4 border-t border-border pt-3 text-sm">
          <p class="truncate text-text-muted">{{ auth.user()?.name }}</p>
          <button uiButton variant="ghost" size="sm" type="button" (click)="signOut()">Sign out</button>
        </div>
      </nav>
      <main id="seller-main" tabindex="-1" class="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6"><router-outlet /></main>
    </div>
    <ui-toast-container />
  `,
})
export class SellerShellComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly items = computed(() => NAV.filter((n) => !n.portal || this.auth.hasPermission('seller:portal')));

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
