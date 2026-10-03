import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

const TABS = [
  { label: 'Return requests', link: '/returns/queue' },
  { label: 'Cancelled-order refunds', link: '/returns/refunds' },
  { label: 'Policy', link: '/returns/policy' },
];

/** Sub-navigation shared by the returns screens. */
@Component({
  selector: 'adm-returns-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-3 text-2xl font-bold">Returns and refunds</h1>
    <nav aria-label="Returns sections" class="mb-6 flex flex-wrap gap-1 border-b border-border">
      @for (tab of tabs; track tab.link) {
        <a [routerLink]="tab.link" routerLinkActive="border-primary text-primary" class="min-h-11 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text">{{ tab.label }}</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class ReturnsLayoutComponent {
  protected readonly tabs = TABS;
}
