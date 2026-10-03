import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { SellerPortalApi } from '@ecom/shared/data-access';
import { ApiException, SELLER_PRODUCT_STATUS_LABEL, type SellerProduct } from '@ecom/contracts';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

/** The seller's listings (MP-02, MP-06) with their approval state, stock, and the items the store has assigned to them. Only their own. */
@Component({
  selector: 'sel-products',
  imports: [RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Products</h1>
      <a uiButton routerLink="/products/new">New product</a>
    </div>
    <p class="mb-4 max-w-2xl text-sm text-text-muted">New listings and changes to a listing's text are reviewed before shoppers can see them. Changing only the price, MRP or stock of a live listing takes effect at once.</p>
    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No listings yet" description="Create a product and submit it for approval."><a uiButton routerLink="/products/new">New product</a></ui-empty-state>
      } @else {
        <ul class="space-y-3">
          @for (p of resource.value(); track p.id) {
            <li class="rounded-lg border border-border p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="font-semibold">{{ p.title }} <ui-badge [tone]="p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : p.status === 'pending' ? 'warning' : 'neutral'">{{ labels[p.status] }}</ui-badge></h2>
                <span class="text-sm">{{ { amount: p.price, currency: 'INR' } | money }}</span>
              </div>
              @if (p.rejectionReason) {
                <p class="mt-1 text-sm text-danger" role="status">Not approved: {{ p.rejectionReason }}</p>
              }
              @if (errorId() === p.id) {
                <p class="mt-1 text-sm text-danger" role="alert">{{ error() }}</p>
              }
              <div class="mt-3 flex flex-wrap items-end gap-2">
                <ui-form-field #st="uiFormField" label="Units in stock">
                  <input uiInput inputmode="numeric" class="!w-28" [id]="st.id" [value]="p.stock" [attr.aria-describedby]="st.describedBy()" (input)="stock.set($any($event.target).value); stockFor.set(p.id)" />
                </ui-form-field>
                <button uiButton size="sm" variant="secondary" type="button" (click)="saveStock(p)">Save stock<span class="sr-only"> for {{ p.title }}</span></button>
                <a uiButton size="sm" variant="secondary" [routerLink]="['/products', p.id]">Edit<span class="sr-only"> {{ p.title }}</span></a>
                @if (p.status === 'draft' || p.status === 'rejected') {
                  <button uiButton size="sm" type="button" (click)="submit(p)">Submit {{ p.title }} for approval</button>
                  <button uiButton size="sm" variant="ghost" type="button" (click)="remove(p)">Delete<span class="sr-only"> {{ p.title }}</span></button>
                }
              </div>
            </li>
          }
        </ul>
      }
      @if (assigned.hasValue() && assigned.value().length > 0) {
        <h2 class="mb-2 mt-8 text-lg font-semibold">Items the store assigned to you</h2>
        <p class="mb-2 text-sm text-text-muted">These catalog items ship from you. The store manages their price and stock.</p>
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[30rem] text-start text-sm">
            <caption class="sr-only">Assigned catalog items</caption>
            <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Item</th><th scope="col" class="p-2 text-end">Price</th><th scope="col" class="p-2 text-end">In stock</th><th scope="col" class="p-2 text-end">Rating</th></tr></thead>
            <tbody class="divide-y divide-border">
              @for (a of assigned.value(); track a.productId) {
                <tr><th scope="row" class="p-2 font-normal">{{ a.title }}</th><td class="p-2 text-end">{{ a.price | money }}</td><td class="p-2 text-end">{{ a.stock }}</td><td class="p-2 text-end">{{ a.rating.count ? a.rating.average + ' (' + a.rating.count + ')' : 'No reviews' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class ProductsPageComponent {
  private readonly api = inject(SellerPortalApi);
  private readonly toast = inject(ToastService);
  protected readonly resource = rxResource({ stream: () => this.api.products() });
  protected readonly assigned = rxResource({ stream: () => this.api.assignedItems() });
  protected readonly labels = SELLER_PRODUCT_STATUS_LABEL;

  protected readonly stock = signal('');
  protected readonly stockFor = signal('');
  protected readonly errorId = signal('');
  protected readonly error = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Products', noindex: true });
  }

  private async run(p: SellerProduct, action: () => Promise<unknown>, done: string): Promise<void> {
    this.errorId.set('');
    try {
      await action();
      this.toast.success(done);
      this.resource.reload();
    } catch (e) {
      this.errorId.set(p.id);
      this.error.set(e instanceof ApiException ? (e.fields?.['stock'] ?? e.message) : 'That did not work. Please try again.');
    }
  }

  protected saveStock(p: SellerProduct): Promise<void> {
    if (this.stockFor() !== p.id) return Promise.resolve();
    return this.run(p, () => firstValueFrom(this.api.setStock(p.id, Number(this.stock()))), `Stock for ${p.title} saved.`);
  }

  protected submit(p: SellerProduct): Promise<void> {
    return this.run(p, () => firstValueFrom(this.api.submitProduct(p.id)), `${p.title} sent for approval.`);
  }

  protected remove(p: SellerProduct): Promise<void> {
    return this.run(p, () => firstValueFrom(this.api.deleteProduct(p.id)), `${p.title} deleted.`);
  }
}
