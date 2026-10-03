import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminReturnApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/contracts';
import { MoneyPipe } from '@ecom/shared/util';
import { ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';

/** Prepaid orders that were cancelled and are waiting for their money to go back (RF-04). Needs `order:refund`. */
@Component({
  selector: 'adm-order-refunds',
  imports: [LocaleDatePipe, RouterLink, MoneyPipe, ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 text-sm text-text-muted">When a customer cancels an order they already paid for, the order shows “refund in progress” until you send the money back and mark it here. No real payment is made in this demo.</p>
    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="Nothing waiting" description="Cancelled prepaid orders that need a refund appear here." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[36rem] text-start text-sm">
            <caption class="sr-only">Cancelled orders waiting for a refund</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">Order</th>
                <th scope="col" class="p-2">Customer</th>
                <th scope="col" class="p-2">Cancelled</th>
                <th scope="col" class="p-2 text-end">Amount</th>
                <th scope="col" class="p-2"><span class="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (p of resource.value(); track p.orderId) {
                <tr>
                  <td class="p-2"><a [routerLink]="['/orders', p.orderId]" class="text-primary hover:underline">{{ p.orderId }}</a></td>
                  <td class="p-2">{{ p.customerName }}</td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ p.cancelledAt ? (p.cancelledAt | date: 'd MMM y, h:mm a') : '' }}</td>
                  <td class="p-2 text-end">{{ p.amount | money }}</td>
                  <td class="p-2 text-end"><button uiButton size="sm" type="button" [loading]="busyId() === p.orderId" (click)="refund(p.orderId)">Mark refunded</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class RefundsPageComponent {
  private readonly api = inject(AdminReturnApi);
  private readonly toast = inject(ToastService);
  protected readonly resource = rxResource({ stream: () => this.api.pendingOrderRefunds() });
  protected readonly busyId = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Order refunds', noindex: true });
  }

  protected async refund(orderId: string): Promise<void> {
    this.busyId.set(orderId);
    try {
      await firstValueFrom(this.api.refundOrder(orderId));
      this.toast.success(`Refund for ${orderId} marked as paid.`);
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not record the refund.');
    } finally {
      this.busyId.set('');
    }
  }
}
