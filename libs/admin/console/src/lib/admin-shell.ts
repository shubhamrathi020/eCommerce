import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, ToastContainerComponent } from '@ecom/shared/ui';

interface NavItem {
  label: string;
  link: string;
  permission: string;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', link: '/', permission: 'order:read:any', exact: true },
  { label: 'Products', link: '/products', permission: 'product:read' },
  { label: 'Orders', link: '/orders', permission: 'order:read:any' },
  { label: 'Content', link: '/content', permission: 'content:write' },
  { label: 'Reviews', link: '/reviews', permission: 'review:moderate' },
  { label: 'Coupons', link: '/coupons', permission: 'coupon:write' },
  { label: 'Users', link: '/users', permission: 'user:read' },
  { label: 'Audit log', link: '/audit', permission: 'user:read' },
  { label: 'Settings', link: '/settings', permission: 'user:read' },
];

/** Back-office frame: sidebar limited to what the user's permissions allow, plus the signed-in user. */
@Component({
  selector: 'adm-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonComponent, ToastContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#admin-main" class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-contrast focus:not-sr-only focus:fixed focus:left-2 focus:top-2">Skip to main content</a>
    <div class="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Admin" class="border-b border-border bg-surface-alt p-3 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:p-4">
        <p class="mb-2 text-lg font-bold text-primary md:mb-4">Shop Admin</p>
        <ul class="flex flex-wrap gap-1 md:flex-col">
          @for (item of items(); track item.link) {
            <li>
              <a [routerLink]="item.link" routerLinkActive="bg-primary text-primary-contrast" [routerLinkActiveOptions]="{ exact: !!item.exact }" class="flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-border">{{ item.label }}</a>
            </li>
          }
        </ul>
      </nav>
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center justify-end gap-3 border-b border-border px-4 py-2 text-sm">
          <span class="text-text-muted">{{ auth.user()?.name }} ({{ auth.user()?.roles?.join(', ') }})</span>
          <button uiButton size="sm" variant="secondary" type="button" (click)="signOut()">Sign out</button>
        </header>
        <main id="admin-main" tabindex="-1" class="flex-1 p-4 md:p-6"><router-outlet /></main>
      </div>
    </div>
    <ui-toast-container />
  `,
})
export class AdminShellComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly items = computed(() => NAV.filter((n) => this.auth.hasPermission(n.permission)));

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
