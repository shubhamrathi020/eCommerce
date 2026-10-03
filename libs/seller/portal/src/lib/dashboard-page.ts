import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '@ecom/shared/core';
import { SellerPortalApi } from '@ecom/shared/data-access';
import { MoneyPipe } from '@ecom/shared/util';
import { SELLER_STATUS_LABEL } from '@ecom/contracts';
import { BadgeComponent, ButtonComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';
import { AuthStore } from '@ecom/shared/state';

/** The first screen: what state the account is in (not applied, waiting, rejected with the reason, suspended) or, once approved, the day's work. */
@Component({
  selector: 'sel-dashboard',
  imports: [RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold">Overview</h1>
    @if (me.hasValue()) {
      @let s = me.value();
      @if (!s) {
        <section class="max-w-2xl rounded-lg border border-border p-4">
          <h2 class="font-semibold">Start selling</h2>
          <p class="mb-3 text-sm text-text-muted">Apply with your business details. Once an administrator approves you, you can list products and receive orders.</p>
          <a uiButton routerLink="/apply">Apply to sell</a>
        </section>
      } @else {
        <p class="mb-4 text-sm">{{ s.displayName }} <ui-badge [tone]="s.status === 'approved' ? 'success' : s.status === 'pending' ? 'warning' : 'danger'">{{ labels[s.status] }}</ui-badge></p>
        @switch (s.status) {
          @case ('pending') {
            <p class="max-w-2xl rounded-lg border border-border p-4" role="status">Your application is being reviewed. We will email you when it is decided; sign in again after that.</p>
          }
          @case ('rejected') {
            <section class="max-w-2xl rounded-lg border border-danger p-4" role="status">
              <h2 class="font-semibold">Your application was not approved</h2>
              <p class="mb-3 text-sm">{{ s.rejectionReason }}</p>
              <a uiButton routerLink="/apply">Fix the details and apply again</a>
            </section>
          }
          @case ('suspended') {
            <p class="max-w-2xl rounded-lg border border-danger p-4" role="alert">Your store is suspended and your listings are off sale. Contact the marketplace team.</p>
          }
          @default {
            @if (!canWork()) {
              <p class="max-w-2xl rounded-lg border border-warning p-4" role="status">You are approved. Sign out and sign in again to open your portal.</p>
            } @else if (stats.hasValue()) {
              <dl class="grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4" aria-label="Today">
                <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Live listings</dt><dd class="text-2xl font-semibold">{{ stats.value().live }}</dd></div>
                <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Awaiting approval</dt><dd class="text-2xl font-semibold">{{ stats.value().pending }}</dd></div>
                <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">To pack</dt><dd class="text-2xl font-semibold">{{ stats.value().toPack }}</dd></div>
                <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">To ship</dt><dd class="text-2xl font-semibold">{{ stats.value().toShip }}</dd></div>
              </dl>
              <p class="mt-4 text-sm">Next payout, if issued now: <strong>{{ { amount: stats.value().upcomingNet, currency: 'INR' } | money }}</strong> after commission.</p>
              @if (stats.value().rejected > 0) {
                <p class="mt-2 text-sm text-danger" role="status">{{ stats.value().rejected }} listing(s) were not approved. <a routerLink="/products" class="underline">See why</a>.</p>
              }
            } @else if (stats.status() === 'error') {
              <ui-error-state (retry)="stats.reload()" />
            } @else {
              <ui-skeleton class="h-24 max-w-3xl" />
            }
          }
        }
      }
    } @else if (me.status() === 'error') {
      <ui-error-state (retry)="me.reload()" />
    } @else {
      <ui-skeleton class="h-24 max-w-2xl" />
    }
  `,
})
export class DashboardPageComponent {
  private readonly api = inject(SellerPortalApi);
  private readonly auth = inject(AuthStore);
  protected readonly labels = SELLER_STATUS_LABEL;
  protected readonly me = rxResource({ stream: () => this.api.me() });
  protected readonly canWork = computed(() => this.auth.hasPermission('seller:portal'));

  /** The day's counts, only asked for once the account can work (the API refuses everything else). */
  protected readonly stats = resource({
    params: () => (this.canWork() && this.me.hasValue() && this.me.value()?.status === 'approved' ? true : undefined),
    loader: async () => {
      const [products, shipments, payouts] = await Promise.all([firstValueFrom(this.api.products()), firstValueFrom(this.api.shipments()), firstValueFrom(this.api.payouts())]);
      return {
        live: products.filter((p) => p.status === 'approved').length,
        pending: products.filter((p) => p.status === 'pending').length,
        rejected: products.filter((p) => p.status === 'rejected').length,
        toPack: shipments.filter((s) => s.status === 'confirmed').length,
        toShip: shipments.filter((s) => s.status === 'packed').length,
        upcomingNet: payouts.upcoming.net,
      };
    },
  });

  constructor() {
    inject(SeoService).set({ title: 'Seller overview', noindex: true });
  }
}
