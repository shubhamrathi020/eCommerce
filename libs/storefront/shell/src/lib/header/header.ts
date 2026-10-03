import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_CONFIG, I18nService, TranslatePipe } from '@ecom/shared/core';
import { DrawerComponent, IconComponent } from '@ecom/shared/ui';
import { AuthStore, CartStore, NotificationStore } from '@ecom/shared/state';
import { SearchBoxComponent } from '../search-box/search-box';
import { CategoryMenuStore } from '../category-menu.store';

@Component({
  selector: 'app-header',
  imports: [RouterLink, IconComponent, DrawerComponent, SearchBoxComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticky top-0 z-20 block print:hidden border-b border-border bg-surface transition-shadow',
    '[class.shadow-card]': 'scrolled()',
    '(window:scroll)': 'onScroll()',
    '(document:keydown.escape)': 'openMenu.set(null)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 md:px-6" [class]="scrolled() ? 'py-2' : 'py-3'">
      <button type="button" class="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-alt lg:hidden" [attr.aria-label]="'nav.openMenu' | t" (click)="drawerOpen.set(true)">
        <ui-icon name="menu" [size]="24" />
      </button>

      <a routerLink="/" class="text-xl font-bold text-primary" [attr.aria-label]="i18n.t('nav.siteHome', { site: siteName })">{{ siteName }}</a>

      <app-search-box idPrefix="search-d" class="order-last hidden min-w-0 flex-1 md:order-none md:block" />

      <nav [attr.aria-label]="'nav.accountCart' | t" class="ms-auto flex items-center gap-1 md:ms-0">
        @if (auth.loggedIn()) {
          <a routerLink="/notifications" class="relative inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-alt" [attr.aria-label]="bellLabel()">
            <ui-icon name="bell" [size]="24" />
            @if (unreadCount() > 0) {
              <span class="absolute end-0 top-0 min-w-5 rounded-full bg-sale px-1 text-center text-xs font-semibold text-on-status" aria-hidden="true">{{ unreadCount() }}</span>
            }
          </a>
        }
        <a routerLink="/wishlist" class="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-alt" [attr.aria-label]="'nav.wishlist' | t"><ui-icon name="heart" [size]="24" /></a>
        <a [routerLink]="auth.loggedIn() ? '/account' : '/account/login'" class="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-alt" [attr.aria-label]="accountLabel()"><ui-icon name="user" [size]="24" /></a>
        <a routerLink="/cart" class="relative inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-alt" [attr.aria-label]="cartLabel()">
          <ui-icon name="cart" [size]="24" />
          @if (cartCount() > 0) {
            <span class="absolute end-0 top-0 min-w-5 rounded-full bg-sale px-1 text-center text-xs font-semibold text-on-status" aria-hidden="true">{{ cartCount() }}</span>
          }
        </a>
      </nav>
    </div>

    <app-search-box idPrefix="search-m" [placeholder]="'search.label' | t" class="block px-4 pb-3 md:hidden" />

    @if (!scrolled()) {
      <nav [attr.aria-label]="'nav.categories' | t" class="relative hidden border-t border-border lg:block">
        <ul class="mx-auto flex max-w-7xl gap-1 px-6">
          @for (root of roots(); track root.id) {
            <li>
              <button
                type="button"
                class="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-surface-alt"
                [attr.aria-expanded]="openMenu() === root.id"
                [attr.aria-controls]="'menu-' + root.id"
                (click)="toggle(root.id)"
                (pointerenter)="hoverOpen($event, root.id)"
              >
                {{ root.name }}
                <ui-icon name="chevron-down" [size]="14" />
              </button>
              @if (openMenu() === root.id) {
                <div
                  [id]="'menu-' + root.id"
                  class="absolute inset-x-0 top-full z-10 border-b border-border bg-surface shadow-popover"
                  (mouseleave)="openMenu.set(null)"
                >
                  <ul class="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-6 py-4">
                    <li class="col-span-3 mb-1">
                      <a [routerLink]="['/c', root.slug]" class="font-semibold text-primary hover:underline" (click)="openMenu.set(null)">{{ 'nav.allIn' | t: { name: root.name } }}</a>
                    </li>
                    @for (child of root.children; track child.id) {
                      <li>
                        <a [routerLink]="['/c', child.slug]" class="block truncate rounded-md px-2 py-2 text-text hover:bg-surface-alt" [attr.title]="child.name" (click)="openMenu.set(null)">{{ child.name }}</a>
                      </li>
                    }
                  </ul>
                </div>
              }
            </li>
          }
        </ul>
      </nav>
    }

    <ui-drawer [(open)]="drawerOpen" [label]="'nav.menu' | t" side="left">
      <ul class="space-y-1">
        @for (root of roots(); track root.id) {
          <li>
            <button type="button" class="flex min-h-11 w-full items-center justify-between rounded-md px-2 font-medium hover:bg-surface-alt" [attr.aria-expanded]="expanded() === root.id" (click)="expanded.set(expanded() === root.id ? null : root.id)">
              {{ root.name }}
              <ui-icon name="chevron-down" [size]="16" [class.rotate-180]="expanded() === root.id" />
            </button>
            @if (expanded() === root.id) {
              <ul class="ms-3 border-s border-border ps-2">
                <li><a [routerLink]="['/c', root.slug]" class="block min-h-11 rounded-md px-2 py-2.5 font-medium text-primary" (click)="drawerOpen.set(false)">{{ 'nav.allIn' | t: { name: root.name } }}</a></li>
                @for (child of root.children; track child.id) {
                  <li><a [routerLink]="['/c', child.slug]" class="block min-h-11 rounded-md px-2 py-2.5 hover:bg-surface-alt" (click)="drawerOpen.set(false)">{{ child.name }}</a></li>
                }
              </ul>
            }
          </li>
        }
      </ul>
    </ui-drawer>
  `,
})
export class HeaderComponent {
  protected readonly i18n = inject(I18nService);
  private readonly menu = inject(CategoryMenuStore);
  private readonly cart = inject(CartStore);
  private readonly notifications = inject(NotificationStore);
  protected readonly auth = inject(AuthStore);
  protected readonly unreadCount = this.notifications.unreadCount;
  protected readonly bellLabel = computed(() => (this.unreadCount() > 0 ? this.i18n.t('nav.notificationsUnread', { count: this.unreadCount() }) : this.i18n.t('nav.notifications')));
  protected readonly accountLabel = computed(() => {
    const user = this.auth.user();
    return user ? this.i18n.t('nav.myAccount', { name: user.name.split(' ')[0] }) : this.i18n.t('nav.signIn');
  });

  protected readonly siteName = inject(APP_CONFIG).siteName;
  protected readonly roots = this.menu.roots;
  protected readonly cartCount = this.cart.count;
  protected readonly cartLabel = computed(() => this.i18n.t('nav.cart', { count: this.cartCount() }));

  protected readonly scrolled = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly openMenu = signal<string | null>(null);
  protected readonly expanded = signal<string | null>(null);
  private openedBy: 'hover' | 'click' = 'click';

  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 80);
  }

  /** Hover opens the menu for mouse users only; touch and keyboard use click. */
  protected hoverOpen(event: PointerEvent, id: string): void {
    if (event.pointerType !== 'mouse' || this.openMenu() === id) return;
    this.openMenu.set(id);
    this.openedBy = 'hover';
  }

  /** A click confirms a hover-opened menu; clicking again (or Escape) closes it. */
  protected toggle(id: string): void {
    if (this.openMenu() === id && this.openedBy === 'click') {
      this.openMenu.set(null);
      return;
    }
    this.openMenu.set(id);
    this.openedBy = 'click';
  }

  /** Close the mega menu when keyboard focus leaves the header. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !(event.currentTarget as HTMLElement).contains(next)) this.openMenu.set(null);
  }
}
