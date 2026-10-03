import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

const TABS = [
  { label: 'Applications', link: '/marketplace/applications' },
  { label: 'Sellers', link: '/marketplace/sellers' },
  { label: 'Listings', link: '/marketplace/listings' },
  { label: 'Commission', link: '/marketplace/commission' },
  { label: 'Payouts', link: '/marketplace/payouts' },
];

/** Sub-navigation shared by the marketplace screens. */
@Component({
  selector: 'adm-marketplace-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-3 text-2xl font-bold">Marketplace</h1>
    <nav aria-label="Marketplace sections" class="mb-6 flex flex-wrap gap-1 border-b border-border">
      @for (tab of tabs; track tab.link) {
        <a [routerLink]="tab.link" routerLinkActive="border-primary text-primary" class="min-h-11 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text">{{ tab.label }}</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class MarketplaceLayoutComponent {
  protected readonly tabs = TABS;
}
