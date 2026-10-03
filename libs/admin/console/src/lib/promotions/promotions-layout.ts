import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

const TABS = [
  { label: 'Promotions', link: '/promotions/list' },
  { label: 'Simulator', link: '/promotions/simulator' },
  { label: 'Gift cards', link: '/promotions/gift-cards' },
  { label: 'Price health', link: '/promotions/price-health' },
];

/** Sub-navigation shared by the promotion screens. */
@Component({
  selector: 'adm-promotions-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-3 text-2xl font-bold">Promotions</h1>
    <nav aria-label="Promotion sections" class="mb-6 flex flex-wrap gap-1 border-b border-border">
      @for (tab of tabs; track tab.link) {
        <a [routerLink]="tab.link" routerLinkActive="border-primary text-primary" class="min-h-11 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text">{{ tab.label }}</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class PromotionsLayoutComponent {
  protected readonly tabs = TABS;
}
