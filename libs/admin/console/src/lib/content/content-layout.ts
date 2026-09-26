import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

const TABS = [
  { label: 'Banners', link: '/content/banners' },
  { label: 'Home sections', link: '/content/sections' },
  { label: 'Pages', link: '/content/pages' },
  { label: 'Footer links', link: '/content/links' },
  { label: 'Redirects', link: '/content/redirects' },
];

/** Sub-navigation shared by the content management screens. */
@Component({
  selector: 'adm-content-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-3 text-2xl font-bold">Content</h1>
    <nav aria-label="Content sections" class="mb-6 flex flex-wrap gap-1 border-b border-border">
      @for (tab of tabs; track tab.link) {
        <a [routerLink]="tab.link" routerLinkActive="border-primary text-primary" class="min-h-11 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text">{{ tab.label }}</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class ContentLayoutComponent {
  protected readonly tabs = TABS;
}
