import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, RESPONSE_INIT, computed, effect, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { OrderApi, ReturnApi } from '@ecom/shared/data-access';
import type { Order } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { BadgeComponent, ButtonComponent, CartLineComponent, ErrorStateComponent, NotFoundComponent, OrderSummaryComponent, SkeletonComponent } from '@ecom/shared/ui';

const PAYMENT_TEXT: Record<Order['paymentStatus'], string> = {
  pending: 'Awaiting payment',
  paid: 'Paid online',
  failed: 'Payment failed',
  cod: 'Pay on delivery',
  refund_pending: 'Refund in progress',
};

/** Order confirmation and tracking. Reachable by the (unguessable) order id, so guests can revisit it. */
@Component({
  selector: 'app-order-page',
  imports: [DatePipe, RouterLink, BadgeComponent, ButtonComponent, CartLineComponent, ErrorStateComponent, NotFoundComponent, OrderSummaryComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <ui-not-found />
    } @else if (order(); as o) {
      @if (placed()) {
        <div class="mb-4 rounded-lg border border-success p-4" role="status">
          <h1 class="text-xl font-bold text-success">Thank you! Your order is placed.</h1>
          <p class="text-sm text-text-muted">A confirmation was sent to {{ o.contact.email }}.</p>
        </div>
      } @else {
        <h1 class="mb-4 text-2xl font-bold md:text-3xl">Order {{ o.id }}</h1>
      }
      <p class="mb-4 text-sm text-text-muted">Order <strong class="text-text">{{ o.id }}</strong> · placed {{ o.createdAt | date: 'd MMM y, h:mm a' }} · <ui-badge [tone]="o.status === 'cancelled' ? 'danger' : o.status === 'delivered' ? 'success' : 'primary'">{{ statusLabel(o) }}</ui-badge></p>

      <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div class="space-y-6">
          <section aria-labelledby="tl">
            <h2 id="tl" class="mb-3 text-lg font-semibold">Tracking</h2>
            <ol class="space-y-3 border-l-2 border-border pl-4">
              @for (step of o.timeline; track step.status) {
                <li class="relative">
                  <span class="absolute -left-[1.4rem] top-1 size-3 rounded-full" [class]="step.at ? (step.status === 'cancelled' ? 'bg-danger' : 'bg-success') : 'bg-border-strong'" aria-hidden="true"></span>
                  <p [class]="step.at ? 'font-medium' : 'text-text-muted'">{{ step.label }}</p>
                  <p class="text-sm text-text-muted">{{ step.at ? (step.at | date: 'd MMM, h:mm a') : 'Pending' }}</p>
                </li>
              }
            </ol>
          </section>

          @if (o.shipments?.length) {
            <section aria-labelledby="shipments">
              <h2 id="shipments" class="mb-1 text-lg font-semibold">Shipments</h2>
              <p class="mb-3 text-sm text-text-muted">Your order ships in {{ o.shipments?.length }} parts. Each seller sends and tracks their own.</p>
              <ul class="space-y-3">
                @for (s of o.shipments; track s.id) {
                  <li class="rounded-lg border border-border p-3 text-sm">
                    <p class="flex flex-wrap items-center gap-2"><strong>From {{ s.sellerName }}</strong> <ui-badge [tone]="s.status === 'delivered' ? 'success' : s.status === 'cancelled' ? 'danger' : 'primary'">{{ shipmentLabel(s.status) }}</ui-badge></p>
                    <p class="text-text-muted">{{ shipmentItems(o, s) }}</p>
                    @if (s.trackingNumber) {
                      <p>Tracking number: <span class="font-mono">{{ s.trackingNumber }}</span></p>
                    }
                  </li>
                }
              </ul>
            </section>
          }

          <section aria-labelledby="items">
            <h2 id="items" class="mb-3 text-lg font-semibold">Items</h2>
            <ul class="divide-y divide-border rounded-lg border border-border px-4">
              @for (line of o.lines; track line.variantId) {
                <li class="py-3"><ui-cart-line [line]="line" [compact]="true" [editable]="false" /></li>
              }
            </ul>
          </section>
        </div>

        <aside class="space-y-4">
          <section class="rounded-lg border border-border p-4" aria-labelledby="sum">
            <h2 id="sum" class="mb-3 font-semibold">Summary</h2>
            <ui-order-summary [totals]="o.totals" [coupon]="undefined" [promotions]="o.promotions" />
            <p class="mt-3 text-sm text-text-muted">{{ paymentText(o) }}</p>
            @if (o.paymentStatus === 'refund_pending') {
              @if (refund.hasValue() && refund.value()?.refundedAt; as paidOn) {
                <p class="mt-1 text-sm text-success" role="status">Refunded to your original payment method on {{ paidOn | date: 'd MMM y' }}.</p>
              } @else {
                <p class="mt-1 text-sm text-text-muted">Your refund will be returned to the original payment method.</p>
              }
            }
          </section>
          <section class="rounded-lg border border-border p-4 text-sm" aria-labelledby="addr">
            <h2 id="addr" class="mb-1 font-semibold">Delivery address</h2>
            <p>{{ o.contact.name }}, {{ o.contact.phone }}</p>
            <p class="text-text-muted">{{ o.address.line1 }}{{ o.address.line2 ? ', ' + o.address.line2 : '' }}, {{ o.address.city }}, {{ o.address.state }} {{ o.address.pincode }}</p>
          </section>
          <div class="flex flex-wrap gap-2 print:hidden">
            <a uiButton variant="secondary" [routerLink]="['/orders', o.id, 'invoice']">View invoice</a>
            @if (isOwner(o)) {
              @if (o.status === 'delivered') {
                <a uiButton variant="secondary" routerLink="/account/returns/new" [queryParams]="{ order: o.id }">Return items</a>
              }
              <a uiButton variant="ghost" routerLink="/account/support/new" [queryParams]="{ order: o.id }">Get help</a>
            }
            @if (canCancel(o)) {
              @if (confirmingCancel()) {
                <button uiButton variant="danger" type="button" [loading]="cancelling()" (click)="cancel(o)">Yes, cancel order</button>
                <button uiButton variant="ghost" type="button" (click)="confirmingCancel.set(false)">Keep order</button>
              } @else {
                <button uiButton variant="ghost" type="button" (click)="confirmingCancel.set(true)">Cancel order</button>
              }
            }
          </div>
        </aside>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-40" />
    }
  `,
})
export class OrderPageComponent {
  readonly id = input.required<string>();
  /** `?placed=1` right after checkout. */
  readonly placed = input<string | undefined>();

  private readonly api = inject(OrderApi);
  private readonly toast = inject(ToastService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly resource = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  protected readonly order = computed<Order | undefined>(() => (this.resource.hasValue() ? this.resource.value() : undefined));
  protected readonly notFound = computed(() => {
    const e = this.resource.error();
    return this.resource.status() === 'error' && e instanceof ApiException && e.code === 'not_found';
  });
  private readonly auth = inject(AuthStore);
  private readonly returns = inject(ReturnApi);
  /** Where the money of a cancelled, prepaid order is (RF-04). Not needed for guests or other orders. */
  protected readonly refund = rxResource({
    params: () => {
      const o = this.order();
      return o?.paymentStatus === 'refund_pending' && this.isOwner(o) ? o.id : undefined;
    },
    stream: ({ params }) => this.returns.orderRefund(params).pipe(catchError(() => of(null))),
  });
  protected readonly confirmingCancel = signal(false);
  protected readonly cancelling = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Your order', noindex: true });
    effect(() => {
      if (this.notFound() && this.response) this.response.status = 404;
    });
    // Mock orders move through packing and shipping on their own; poll so the timeline updates.
    effect((onCleanup) => {
      const o = this.order();
      if (!this.browser || !o || o.status === 'delivered' || o.status === 'cancelled' || o.status === 'pending_payment') return;
      const timer = setInterval(() => this.resource.reload(), 15000);
      onCleanup(() => clearInterval(timer));
    });
  }

  /** Returns and support are for the signed-in customer who placed the order. */
  protected isOwner(o: Order): boolean {
    const user = this.auth.user();
    return !!user && !!o.userId && o.userId === user.id;
  }

  protected statusLabel(o: Order): string {
    return { pending_payment: 'Awaiting payment', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }[o.status];
  }

  protected shipmentLabel(status: string): string {
    return { confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }[status] ?? status;
  }

  protected shipmentItems(o: Order, s: { variantIds: string[] }): string {
    return o.lines
      .filter((l) => s.variantIds.includes(l.variantId))
      .map((l) => `${l.quantity} × ${l.title}`)
      .join(', ');
  }

  protected paymentText(o: Order): string {
    return PAYMENT_TEXT[o.paymentStatus];
  }

  protected canCancel(o: Order): boolean {
    return o.status === 'confirmed' || o.status === 'packed' || o.status === 'pending_payment';
  }

  protected async cancel(o: Order): Promise<void> {
    this.cancelling.set(true);
    try {
      await firstValueFrom(this.api.cancel(o.id));
      this.toast.success('Your order was cancelled.');
      this.resource.reload();
    } catch (error) {
      this.toast.error(error instanceof ApiException ? error.message : 'Could not cancel this order.');
    } finally {
      this.cancelling.set(false);
      this.confirmingCancel.set(false);
    }
  }
}
