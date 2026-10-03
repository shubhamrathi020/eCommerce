import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { SellerPortalApi } from '@ecom/shared/data-access';
import { ApiException, SELLER_NEXT, SHIPMENT_LABEL, type SellerShipmentView } from '@ecom/contracts';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

const NEXT_ACTION: Record<string, string> = { packed: 'Mark as packed', shipped: 'Mark as shipped', delivered: 'Mark as delivered' };

/** The seller's shipments (MP-04): the part of each order they send. Only the ship-to details needed to deliver are shown. */
@Component({
  selector: 'sel-orders',
  imports: [LocaleDatePipe, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold">Orders to ship</h1>
    <p class="mb-4 max-w-2xl text-sm text-text-muted">Each shipment is your part of a customer's order. Move it along as you pack, hand it to a courier (add the tracking number) and it is delivered.</p>
    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No shipments yet" description="Paid and cash-on-delivery orders containing your products appear here." />
      } @else {
        <ul class="space-y-4">
          @for (s of resource.value(); track s.id) {
            <li class="rounded-lg border border-border p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="font-semibold">{{ s.id }} <ui-badge [tone]="s.status === 'delivered' ? 'success' : 'primary'">{{ labels[s.status] }}</ui-badge></h2>
                <span class="text-sm text-text-muted">Placed {{ s.placedAt | date: 'd MMM y, h:mm a' }}</span>
              </div>
              <ul class="mt-2 text-sm" aria-label="Items in this shipment">
                @for (i of s.items; track $index) {
                  <li>{{ i.quantity }} × {{ i.title }} <span class="text-text-muted">({{ i.unitPrice | money }} each)</span></li>
                }
              </ul>
              <p class="mt-2 text-sm"><span class="text-text-muted">Ship to:</span> {{ s.shipTo.name }}, {{ s.shipTo.phone }}, {{ s.shipTo.line1 }}@if (s.shipTo.line2) { , {{ s.shipTo.line2 }} }, {{ s.shipTo.city }}, {{ s.shipTo.state }} {{ s.shipTo.pincode }}</p>
              @if (s.trackingNumber) {
                <p class="text-sm"><span class="text-text-muted">Tracking:</span> <span class="font-mono">{{ s.trackingNumber }}</span></p>
              }
              @if (errorId() === s.id) {
                <p class="mt-2 text-sm text-danger" role="alert">{{ error() }}</p>
              }
              @if (nextOf(s); as next) {
                <div class="mt-3 flex flex-wrap items-end gap-2">
                  @if (next === 'shipped') {
                    <ui-form-field #t="uiFormField" label="Courier tracking number">
                      <input uiInput [id]="t.id" class="!w-56" autocomplete="off" [attr.aria-describedby]="t.describedBy()" (input)="tracking.set($any($event.target).value); trackingFor.set(s.id)" />
                    </ui-form-field>
                  }
                  <button uiButton size="sm" type="button" [loading]="busy() === s.id" (click)="advance(s, next)">{{ actions[next] }}<span class="sr-only"> for {{ s.id }}</span></button>
                </div>
              }
            </li>
          }
        </ul>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class OrdersPageComponent {
  private readonly api = inject(SellerPortalApi);
  private readonly toast = inject(ToastService);
  protected readonly resource = rxResource({ stream: () => this.api.shipments() });
  protected readonly labels = SHIPMENT_LABEL;
  protected readonly actions = NEXT_ACTION;

  protected readonly tracking = signal('');
  protected readonly trackingFor = signal('');
  protected readonly busy = signal('');
  protected readonly errorId = signal('');
  protected readonly error = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Orders', noindex: true });
  }

  protected nextOf(s: SellerShipmentView) {
    return SELLER_NEXT[s.status];
  }

  protected async advance(s: SellerShipmentView, next: string): Promise<void> {
    this.busy.set(s.id);
    this.errorId.set('');
    try {
      await firstValueFrom(this.api.advanceShipment(s.id, next === 'shipped' && this.trackingFor() === s.id ? this.tracking() : undefined));
      this.toast.success(`${s.id} is now ${next}.`);
      this.resource.reload();
    } catch (e) {
      this.errorId.set(s.id);
      this.error.set(e instanceof ApiException ? (e.fields?.['trackingNumber'] ?? e.message) : 'That did not work. Please try again.');
    } finally {
      this.busy.set('');
    }
  }
}
